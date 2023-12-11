import { context } from '@actions/github';

import { getReportTag } from '../constants/getReportTag';
import { GITHUB_MESSAGE_SIZE_LIMIT } from '../constants/GITHUB_MESSAGE_SIZE_LIMIT';
import { formatCoverage } from '../format/formatCoverage';
import { formatErrors } from '../format/formatErrors';
import { formatRunReport } from '../format/formatRunReport';
import { formatThresholdResults } from '../format/formatThresholdResults';
import { getFailureDetails } from '../format/getFailureDetails';
import { getTestRunSummary } from '../format/summary/getTestRunSummary';
import template from '../format/template.md';
import { JsonReport } from '../typings/JsonReport';
import { Options } from '../typings/Options';
import { SummaryReport, TestRunReport } from '../typings/Report';
import { ThresholdResult } from '../typings/ThresholdResult';
import { DataCollector } from '../utils/DataCollector';
import { i18n } from '../utils/i18n';
import { insertArgs } from '../utils/insertArgs';

export const getSha = () =>
    context.payload.after ??
    context.payload.pull_request?.head.sha ??
    context.sha;

export const createReport = (
    dataCollector: DataCollector<JsonReport>,
    options: Options,
    thresholdResults: ThresholdResult[]
): SummaryReport => {
    console.log('🐙 dataCollector', dataCollector);
    console.log('🐙 options', options);
    console.log('🐙 thresholdResults', thresholdResults);
    const { workingDirectory, customTitle } = options;

    const { errors, data } = dataCollector.get();

    console.log('🐙 data, errors', data.length, errors);

    const [headReport, baseReport] = data;

    // console.log('🐙 headReport, baseReport', ObjectheadReport, baseReport);

    const formattedErrors = formatErrors(errors);

    console.log('🐙 formattedErrors', formattedErrors);

    const formattedThresholdResults = formatThresholdResults(thresholdResults);

    console.log('🐙 formattedThresholdResults', formattedThresholdResults);

    const coverage = formatCoverage(headReport, baseReport, undefined, false);

    console.log('🐙 coverage', coverage);

    const summary = getTestRunSummary(headReport);

    console.log('🐙 summary', summary);

    const reportFailures = getFailureDetails(headReport);

    console.log('🐙 reportFailures', reportFailures);

    const runReport: TestRunReport = {
        title: i18n(headReport.success ? 'testsSuccess' : 'testsFail'),
        summary,
        failures: reportFailures,
    };

    console.log('🐙 runReport', runReport);

    const formattedReport = formatRunReport(runReport);

    console.log('🐙 formattedReport', formattedReport);

    let templateText = insertArgs(template, {
        body: [
            formattedErrors,
            formattedThresholdResults,
            coverage,
            formattedReport,
        ].join('\n'),
        dir: workingDirectory || '',
        tag: getReportTag(options),
        title: insertArgs(customTitle || i18n('summaryTitle'), {
            dir: workingDirectory ? `for \`${workingDirectory}\`` : '',
        }),
        sha: getSha(),
    });

    console.log('🐙 templateText', templateText);

    if (templateText.length > GITHUB_MESSAGE_SIZE_LIMIT) {
        console.log('🦄 message too big');
        const reducedCoverage = formatCoverage(
            headReport,
            baseReport,
            undefined,
            true
        );

        console.log('🐙 reducedCoverage', reducedCoverage);

        const title = insertArgs(customTitle || i18n('summaryTitle'), {
            dir: workingDirectory ? `for \`${workingDirectory}\`` : '',
        });

        console.log('🐙 title', title);

        const tag = getReportTag(options);

        templateText = insertArgs(template, {
            body: [
                formattedErrors,
                formattedThresholdResults,
                reducedCoverage,
                formattedReport,
            ].join('\n'),
            dir: workingDirectory || '',
            tag,
            title,
            sha: getSha(),
        });

        console.log('🐙 templateText', templateText);
    }

    return {
        text: templateText,
        runReport,
    };
};
