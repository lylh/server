const { DEFAULT_SOURCE, PROVIDERS } = require('./src/consts');
const toubiec = require('./src/provider/toubiec');
const find = require('./src/provider/find');

// 测试歌曲ID
const testSongId = '2644532873'; // 单依纯 - 分身

async function testToubiePriority() {
    console.log('=== 测试toubiec音源优先级和音质遍历 ===\n');
    
    // 1. 检查优先级设置
    console.log('1. 检查音源优先级:');
    console.log('DEFAULT_SOURCE:', DEFAULT_SOURCE);
    console.log('toubiec是否为最高优先级:', DEFAULT_SOURCE[0] === 'toubiec' ? '✅ 是' : '❌ 否');
    console.log();
    
    // 2. 测试音质遍历功能
    console.log('2. 测试音质遍历功能:');
    
    // 测试各个音质级别
    const qualityLevels = ['jymaster', 'jyeffect', 'jysky', 'standard'];
    
    for (const level of qualityLevels) {
        try {
            console.log(`正在测试音质级别: ${level}`);
            const result = await toubiec.getSingleQuality(testSongId, level);
            if (result && result.url) {
                console.log(`✅ ${level}: 成功获取URL`);
                console.log(`   - 码率: ${result.br || 'N/A'}`);
                console.log(`   - 大小: ${result.size || 'N/A'}`);
                console.log(`   - URL: ${result.url.substring(0, 50)}...`);
            } else {
                console.log(`❌ ${level}: 未获取到有效URL`);
            }
        } catch (error) {
            console.log(`❌ ${level}: 请求失败 - ${error.message}`);
        }
        console.log();
    }
    
    // 3. 测试自动音质选择
    console.log('3. 测试自动音质选择:');
    try {
        const songInfo = { id: testSongId };
        const url = await toubiec.check(songInfo);
        console.log('✅ 自动音质选择成功');
        console.log(`获取到的URL: ${url.substring(0, 50)}...`);
    } catch (error) {
        console.log(`❌ 自动音质选择失败: ${error.message}`);
    }
    console.log();
    
    // 4. 测试通过find模块获取歌曲信息
    console.log('4. 测试通过find模块获取歌曲信息:');
    try {
        const songInfo = await find(testSongId);
        console.log('✅ 成功获取歌曲信息:');
        console.log(`   - 歌曲名: ${songInfo.name}`);
        console.log(`   - 艺术家: ${songInfo.artists.map(a => a.name).join(', ')}`);
        console.log(`   - 专辑: ${songInfo.album.name}`);
        console.log(`   - 时长: ${songInfo.duration}ms`);
    } catch (error) {
        console.log(`❌ 获取歌曲信息失败: ${error.message}`);
    }
}

// 运行测试
testToubiePriority().catch(console.error);