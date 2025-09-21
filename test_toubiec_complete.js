const { track } = require('./src/provider/toubiec');

async function testCompleteFlow() {
    console.log('Testing complete cookie flow for toubiec provider...');
    
    const testId = '33248189';
    
    try {
        console.log(`\n=== Testing track function with ID: ${testId} ===`);
        
        const result = await track(testId);
        
        if (result) {
            console.log('✅ Success! Got result:', {
                url: result.url,
                quality: result.quality,
                size: result.size,
                type: result.type
            });
        } else {
            console.log('❌ No result returned');
        }
        
    } catch (error) {
        console.log('❌ Error occurred:', error.message);
        
        // 检查错误类型
        if (error.message.includes('520')) {
            console.log('ℹ️  API returned 520 error - service may be temporarily unavailable');
        } else if (error.message.includes('403')) {
            console.log('ℹ️  403 error - cookie handling mechanism should have been triggered');
        } else if (error.message.includes('All quality levels failed')) {
            console.log('ℹ️  All quality levels failed - this may indicate API service issues');
        }
    }
}

testCompleteFlow();