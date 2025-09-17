const match = require('./src/provider/match');
const { DEFAULT_SOURCE } = require('./src/consts');

// 测试歌曲ID
const testSongId = '2644532873'; // 单依纯 - 分身

async function testSourceOrder() {
    console.log('=== 测试音源优先级选择逻辑 ===\n');
    
    console.log('当前音源优先级顺序:', DEFAULT_SOURCE);
    console.log('预期：应该优先选择 toubiec 音源\n');
    
    try {
        console.log('开始测试音源选择...');
        
        // 测试多次以确保一致性
        for (let i = 1; i <= 3; i++) {
            console.log(`\n--- 第 ${i} 次测试 ---`);
            
            const startTime = Date.now();
            const result = await match(testSongId);
            const endTime = Date.now();
            
            console.log(`选中的音源: ${result.source}`);
            console.log(`响应时间: ${endTime - startTime}ms`);
            console.log(`音频URL: ${result.url.substring(0, 50)}...`);
            console.log(`码率: ${result.br || 'N/A'}`);
            
            if (result.source === 'toubiec') {
                console.log('✅ 正确选择了 toubiec 音源');
            } else {
                console.log(`❌ 选择了 ${result.source} 音源，而不是 toubiec`);
            }
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

// 运行测试
testSourceOrder().then(() => {
    console.log('\n测试完成');
    process.exit(0);
}).catch((error) => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
});