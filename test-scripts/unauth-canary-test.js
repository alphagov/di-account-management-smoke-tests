const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const syntheticsConfiguration = synthetics.getConfiguration();
const syntheticsLogHelper = require('SyntheticsLogHelper');

const CANARY_NAME = synthetics.getCanaryName();
const SYNTHETICS_CONFIG = synthetics.getConfiguration();

SYNTHETICS_CONFIG.setConfig({
    screenshotOnStepStart: false,
    screenshotOnStepSuccess: true,
    screenshotOnStepFailure: true,
});


exports.handler = async () => {
    return await loadUnauthenticatedJourney();
};

const loadUnauthenticatedJourney = async function () {

    const urls = ['https://home.integration.account.gov.uk/'];
    const basicAuthUsername = "integration-user";
    const basicAuthPassword = "winter2021";   

    let page = await synthetics.getPage();     

    await page.authenticate({
        username: basicAuthUsername,
        password: basicAuthPassword,
    });


    // test will fail if the page fails to load
    for (const url of urls) {
        await loadUrl(page, url);
    }
}

const loadUrl = async function (page, url) {
    let stepName = null;
    let domcontentloaded = false;

    try {
        stepName = new URL(url).hostname;
    } catch (e) {
        const errorString = `Error parsing url: ${url}. ${e}`;
        log.error(errorString);
        throw e;
    }

    await synthetics.executeStep(stepName, async function () {
        const sanitizedUrl = syntheticsLogHelper.getSanitizedUrl(url);

        const response = await page.goto(url, { waitUntil: ['domcontentloaded'], timeout: 3000});
        if (response) {
            domcontentloaded = true;
            const status = response.status();
            const statusText = response.statusText();
            
            logResponseString = `Response from url: ${sanitizedUrl}  Status: ${status}  Status Text: ${statusText}`;

            //If the response status code is not a 2xx success code
            if (response.status() < 200 || response.status() > 299) {
                throw new Error(`Failed to load url: ${sanitizedUrl} ${response.status()} ${response.statusText()}`);
            }
        } else {
            const logNoResponseString = `No response returned for url: ${sanitizedUrl}`;
            log.error(logNoResponseString);
            throw new Error(logNoResponseString);
        }
    });

    // Wait for 3 seconds to let page load fully before taking screenshot.
    if (domcontentloaded) {
        await page.waitFor(3000);
        await synthetics.takeScreenshot(stepName, 'loaded');
        // Reset the page in-between tests
        await resetPage(page);
    }
};

const resetPage = async function(page) {
    try {
        await page.goto('about:blank',{waitUntil: ['load', 'networkidle0'], timeout: 3000} );
    } catch (e) {
        synthetics.addExecutionError('Unable to open a blank page. ', e);
    }
}
