class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onTestResult(test, testResult, aggregatedResults) {
    const className = testResult.testFilePath.split('/').pop().replace('.test.js', '');
    (testResult.testResults || []).forEach(assertion => {
      let status = '✅ PASSOU';
      if (assertion.status === 'failed') status = '❌ FALHOU';
      else if (assertion.status === 'pending') status = '⏭️ PULADO';
      
      const payload = {
        status,
        class: className,
        name: assertion.title,
        time: ((assertion.duration || 0) / 1000).toFixed(3) + 's'
      };
      console.log('JEST_TEST_RESULT:' + JSON.stringify(payload));
    });
  }
}

module.exports = CustomReporter;
