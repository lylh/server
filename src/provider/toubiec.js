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
	'sec-fetch-site': 'same-origin'
};

/**
 * 通过指定音质获取音乐URL
 * @param {string} id 歌曲ID
 * @param {string} level 音质级别
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
		logger.debug({ id, level }, 'Requesting music URL from toubiec API');

		const response = await request('POST', url, postHeaders, JSON.stringify(payload));
		const jsonBody = await response.json();

		logger.debug({ jsonBody }, 'Received response from toubiec API');

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
		logger.error({ error, id, level }, 'Error fetching music URL from toubiec API');
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
