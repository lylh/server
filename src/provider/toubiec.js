const request = require('../request');
const { getManagedCacheStorage } = require('../cache');
const { logScope } = require('../logger');

const logger = logScope('provider/toubiec');

// 音质级别映射
const QUALITY_LEVELS = {
	flac: 'jymaster', // 无损
	hq: 'jyeffect',   // 高品质
	sq: 'jysky',      // 超品质
	std: 'standard'   // 标准
};

// 请求头配置
const headers = {
	'accept': '*/*',
	'accept-language': 'zh-CN,zh;q=0.9',
	'origin': 'https://wyapi.toubiec.cn',
	'referer': 'https://wyapi.toubiec.cn/',
	'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
	'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
	'sec-fetch-dest': 'empty',
	'sec-fetch-mode': 'cors',
	'sec-fetch-site': 'same-origin',
	'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
};

/**
 * 通过指定音质获取音乐URL
 * @param {string} id 歌曲ID
 * @param {string} level 音质级别
 * @param {boolean} isRetry 是否为重试请求
 * @returns {Promise<string>} 音乐URL
 */
const getSingleQuality = async (id, level) => {
	const url = 'https://wyapi.toubiec.cn/api/music/url';
	const payload = {
        id: id,
        level: level,
    };
    const postHeaders = {
        ...headers,
        'Content-Type': 'application/json'
    };

	try {
		logger.debug({ id, level, isRetry }, 'Requesting music URL from toubiec API');

		const response = await request('POST', url, postHeaders, JSON.stringify(payload));
		const jsonBody = await response.json();

		// 检查HTTP状态码
		if (response.statusCode === 403 && !isRetry) {
			logger.warn({ id, level, status: response.statusCode }, 'Received HTTP 403 error, attempting to use response cookie and retry');

			// 直接从403响应中获取cookie
			const setCookieHeader = response.headers['set-cookie'];
			if (setCookieHeader) {
				logger.debug('Found cookie in 403 response, retrying with cookie');

				// 使用获取到的cookie重新请求
				const newHeaders = {
					...headers,
					'cookie': Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader
				};

				const retryResponse = await request('GET', url, newHeaders);

				// 检查重试响应的状态码
				if (retryResponse.statusCode !== 200) {
					logger.error({ id, level, status: retryResponse.statusCode }, `Retry request returned HTTP ${retryResponse.statusCode}`);
					return null;
				}

				const retryJsonBody = await retryResponse.json();

				logger.debug({ retryJsonBody }, 'Received retry response from toubiec API');

				if (retryJsonBody.code === 200 && retryJsonBody.data && retryJsonBody.data.length > 0) {
					const audioData = retryJsonBody.data[0];
					if (audioData.url && audioData.url.trim() !== '') {
						logger.info({ id, level }, 'Successfully got music URL after HTTP 403 retry');
						return {
							url: audioData.url,
							br: audioData.br || null,
							size: audioData.size || null,
							md5: audioData.md5 || null,
							level: audioData.level || level
						};
					}
				} else if (retryJsonBody.code !== 200) {
					// 记录重试后的其他错误码
					logger.error({
						id,
						level,
						code: retryJsonBody.code,
						message: retryJsonBody.message || 'Unknown error',
						response: retryJsonBody
					}, `Retry request failed with code ${retryJsonBody.code}`);
				}
			} else {
				logger.warn({ id, level }, 'No cookie found in 403 response headers');
			}

			logger.error({ id, level }, 'Failed to resolve HTTP 403 error after retry');
			return null;
		}

		// 检查响应状态码
		if (response.statusCode !== 200) {
			logger.error({ id, level, status: response.statusCode }, `Request returned HTTP ${response.statusCode}`);
			return null;
		}

		const jsonBody = await response.json();
		logger.debug({ jsonBody }, 'Received response from toubiec API');

		// 处理API响应中的403错误码
		if (jsonBody.code === 403 && !isRetry) {
			logger.warn({ id, level, code: jsonBody.code }, 'Received API 403 error, attempting to use response cookie and retry');

			// 直接从403响应中获取cookie
			const setCookieHeader = response.headers['set-cookie'];
			if (setCookieHeader) {
				logger.debug('Found cookie in 403 response, retrying with cookie');

				// 使用获取到的cookie重新请求
				const newHeaders = {
					...headers,
					'cookie': Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader
				};

				const retryResponse = await request('GET', url, newHeaders);

				// 检查重试响应的状态码
				if (retryResponse.statusCode !== 200) {
					logger.error({ id, level, status: retryResponse.statusCode }, `Retry request returned HTTP ${retryResponse.statusCode}`);
					return null;
				}

				const retryJsonBody = await retryResponse.json();

				logger.debug({ retryJsonBody }, 'Received retry response from toubiec API');

				if (retryJsonBody.code === 200 && retryJsonBody.data && retryJsonBody.data.length > 0) {
					const audioData = retryJsonBody.data[0];
					if (audioData.url && audioData.url.trim() !== '') {
						logger.info({ id, level }, 'Successfully got music URL after API 403 retry');
						return {
							url: audioData.url,
							br: audioData.br || null,
							size: audioData.size || null,
							md5: audioData.md5 || null,
							level: audioData.level || level
						};
					}
				} else if (retryJsonBody.code !== 200) {
					// 记录重试后的其他错误码
					logger.error({
						id,
						level,
						code: retryJsonBody.code,
						message: retryJsonBody.message || 'Unknown error',
						response: retryJsonBody
					}, `Retry request failed with code ${retryJsonBody.code}`);
				}
			} else {
				logger.warn({ id, level }, 'No cookie found in 403 response headers');
			}

			logger.error({ id, level }, 'Failed to resolve API 403 error after retry');
			return null;
		}

		if (jsonBody.code === 200 && jsonBody.data && jsonBody.data.length > 0) {
			const audioData = jsonBody.data[0];
			if (audioData.url && audioData.url.trim() !== '') {
				return {
					url: audioData.url,
					br: audioData.br || null,
					size: audioData.size || null,
					md5: audioData.md5 || null,
					level: audioData.level || level
				};
			}
		} else if (jsonBody.code === 404) {
            logger.warn({ id, level, msg: jsonBody.msg }, 'toubiec API returned 404');
        }

		logger.debug({ id, level }, 'No valid URL found in response');
		return null;
	} catch (error) {
		logger.error({ error: error.message, stack: error.stack, id, level }, 'Error fetching music URL from toubiec API');
		return null;
	}
};

/**
 * 获取音乐URL，按音质优先级尝试
 * @param {string} id 歌曲ID
 * @returns {Promise<string>} 音乐URL
 */
const track = async (id) => {
	// 按音质优先级尝试获取URL
	const qualityOrder = ['lossless','hires', 'jymaster', 'jyeffect', 'jysky', 'standard'];

	for (const level of qualityOrder) {
		const result = await getSingleQuality(id, level);
		if (result && result.url) {
			logger.debug({ id, level, url: result.url }, 'Successfully got music URL');
			return result.url;
		}
	}

	logger.warn({ id }, 'Failed to get music URL from all quality levels');
	return Promise.reject(new Error('No available music URL found'));
};

/**
 * 检查歌曲是否可用并获取URL
 * @param {Object} info 歌曲信息对象
 * @param {string} info.id 歌曲ID
 * @returns {Promise<string>} 音乐URL
 */
const check = async (info) => {
	if (!info || !info.id) {
		logger.error({ info }, 'Invalid song info provided');
		return Promise.reject(new Error('Invalid song info'));
	}

	logger.debug({ info }, 'Checking song availability on toubiec');
	return track(info.id.toString());
};

// 缓存管理
const cs = getManagedCacheStorage('provider/toubiec');
cs.aliveDuration = 30 * 60 * 1000; // 30分钟缓存

// 导出带缓存的check函数
const cachedCheck = (info) => {
	const cacheKey = info.id.toString();
	return cs.cache(cacheKey, () => check(info));
};

module.exports = {
	check: cachedCheck,
	track,
	getSingleQuality
};
