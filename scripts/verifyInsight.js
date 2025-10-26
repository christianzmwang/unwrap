/* eslint-disable no-console */
const TARGET_ID = '68fdd0416736f9ac1aad9513';
const TARGET_SUBREDDIT = 'uberdrivers';
const EXPECTED_RAW_COUNT = 18;
const EXPECTED_FILTERED_COUNT = 17;

const host = process.env.NEXT_VERIFY_HOST ?? 'http://localhost:3000';
const cacheBuster = Date.now().toString();
const url = `${host}/api/insights?subreddit=${encodeURIComponent(TARGET_SUBREDDIT)}&id=${TARGET_ID}&ts=${cacheBuster}`;

async function run() {
  console.log(`🔍 Verifying insight via ${url}`);

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    console.error('❌ Failed to reach API route.', error);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`❌ API responded with status ${response.status}`);
    const body = await response.text();
    console.error('Payload:', body);
    process.exit(1);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    console.error('❌ Failed to parse API response as JSON.', error);
    process.exit(1);
  }

  if (payload.Subreddit !== TARGET_SUBREDDIT) {
    console.error(`❌ Expected subreddit ${TARGET_SUBREDDIT}, received ${payload.Subreddit}`);
    process.exit(1);
  }

  if (payload.Resolved_Id !== TARGET_ID) {
    console.error(`❌ Expected resolved id ${TARGET_ID}, received ${payload.Resolved_Id ?? 'undefined'}`);
    process.exit(1);
  }

  const rawCount = Array.isArray(payload.Raw_insights) ? payload.Raw_insights.length : 0;
  const filteredCount = Array.isArray(payload.Filtered_Insights) ? payload.Filtered_Insights.length : 0;

  if (rawCount !== EXPECTED_RAW_COUNT) {
    console.error(`❌ Expected ${EXPECTED_RAW_COUNT} raw insights, received ${rawCount}`);
    process.exit(1);
  }

  if (filteredCount !== EXPECTED_FILTERED_COUNT) {
    console.error(`❌ Expected ${EXPECTED_FILTERED_COUNT} filtered insights, received ${filteredCount}`);
    process.exit(1);
  }

  console.log('✅ Insight document matches expected id, subreddit, and insight counts.');
  process.exit(0);
}

run();
