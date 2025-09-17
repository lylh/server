const toubiec = require('./src/provider/toubiec');
const find = require('./src/provider/find');

// 测试歌曲ID（用户提供的示例）
const testSongId = '2644532873';

async function testToubiecProvider() {
    console.log('开始测试 toubiec 音源提供商...');
    console.log('测试歌曲ID:', testSongId);
    
    try {
        // 首先获取歌曲信息
        console.log('\n1. 获取歌曲信息...');
        const songInfo = await find(testSongId);
        console.log('歌曲信息:', JSON.stringify(songInfo, null, 2));
        
        // 测试 toubiec 音源
        console.log('\n2. 测试 toubiec 音源...');
        const audioUrl = await toubiec.check(songInfo);
        console.log('获取到的音频URL:', audioUrl);
        
        // 测试直接通过ID获取
        console.log('\n3. 直接通过ID测试...');
        const directUrl = await toubiec.track(testSongId);
        console.log('直接获取的音频URL:', directUrl);
        
        console.log('\n✅ toubiec 音源测试成功！');
        
    } catch (error) {
        console.error('❌ toubiec 音源测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

// 运行测试
testToubiecProvider().then(() => {
    console.log('\n测试完成');
    process.exit(0);
}).catch((error) => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
});