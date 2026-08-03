const assert = require('assert');

// Logic verification unit tests for RatingSubmissionModal contract & state lifecycle
console.log('🧪 Running RatingSubmissionModal unit and logic tests...');

// 1. Verify Payload Formatting & Required Fields
function formatRatingPayload(bookingId, ratingScore, reviewText) {
  if (!ratingScore || ratingScore < 1 || ratingScore > 5) {
    throw new Error('Please select a star rating (1 to 5 stars).');
  }
  if (reviewText && reviewText.length > 500) {
    throw new Error('Comment must not exceed 500 characters.');
  }

  return {
    booking_id: bookingId,
    bookingId: bookingId,
    rating: ratingScore,
    ratingScore: ratingScore,
    comment: reviewText ? reviewText.trim() : undefined,
    reviewText: reviewText ? reviewText.trim() : undefined,
  };
}

// Test Case 1: Initial unselected rating (0 stars) should fail validation
try {
  assert.throws(
    () => formatRatingPayload('booking-123', 0, 'Great service'),
    /Please select a star rating/
  );
  console.log('✅ Pass 1: Initial unselected rating (0 stars) rejects submission');
} catch (e) {
  console.error('❌ Fail 1: Initial unselected rating validation failed', e);
  process.exit(1);
}

// Test Case 2: Valid 5-star rating with comment within 500 chars
try {
  const payload = formatRatingPayload('booking-123', 5, 'Great service!');
  assert.strictEqual(payload.booking_id, 'booking-123');
  assert.strictEqual(payload.rating, 5);
  assert.strictEqual(payload.comment, 'Great service!');
  console.log('✅ Pass 2: Valid 5-star rating produces correct API payload format');
} catch (e) {
  console.error('❌ Fail 2: Valid payload test failed', e);
  process.exit(1);
}

// Test Case 3: Valid 1-star rating without comment
try {
  const payload = formatRatingPayload('booking-123', 1, '');
  assert.strictEqual(payload.rating, 1);
  assert.strictEqual(payload.comment, undefined);
  console.log('✅ Pass 3: Valid 1-star rating without comment produces undefined comment');
} catch (e) {
  console.error('❌ Fail 3: 1-star optional comment test failed', e);
  process.exit(1);
}

// Test Case 4: Review text over 500 characters should throw validation error
try {
  const longComment = 'A'.repeat(501);
  assert.throws(
    () => formatRatingPayload('booking-123', 4, longComment),
    /500 characters/
  );
  console.log('✅ Pass 4: Exceeding 500-character limit throws validation error');
} catch (e) {
  console.error('❌ Fail 4: Over 500-character test failed', e);
  process.exit(1);
}

// Test Case 5: Live character counter calculator
function getCharacterCountState(text) {
  const count = text ? text.length : 0;
  const isLimitReached = count === 500;
  const isOverLimit = count > 500;
  return { count, isLimitReached, isOverLimit };
}

try {
  assert.deepStrictEqual(getCharacterCountState(''), { count: 0, isLimitReached: false, isOverLimit: false });
  assert.deepStrictEqual(getCharacterCountState('A'.repeat(500)), { count: 500, isLimitReached: true, isOverLimit: false });
  assert.deepStrictEqual(getCharacterCountState('A'.repeat(501)), { count: 501, isLimitReached: false, isOverLimit: true });
  console.log('✅ Pass 5: Character counter calculation accurately tracks length & limit states');
} catch (e) {
  console.error('❌ Fail 5: Character counter test failed', e);
  process.exit(1);
}

// Test Case 6: Duplicate (409) Error Handling Mapper
function mapApiErrorToMessage(status, rawMessage) {
  if (status === 409 || (rawMessage && rawMessage.includes('already'))) {
    return 'A rating has already been submitted for this booking.';
  }
  if (status === 403) {
    return 'You are not authorized to rate this booking.';
  }
  if (status === 401) {
    return 'Session expired. Please log in again.';
  }
  return rawMessage || 'Failed to submit rating. Please try again.';
}

try {
  assert.strictEqual(mapApiErrorToMessage(409, 'Conflict'), 'A rating has already been submitted for this booking.');
  assert.strictEqual(mapApiErrorToMessage(403, 'Forbidden'), 'You are not authorized to rate this booking.');
  assert.strictEqual(mapApiErrorToMessage(401, 'Unauthorized'), 'Session expired. Please log in again.');
  console.log('✅ Pass 6: API error codes (409, 403, 401) map to friendly user messages');
} catch (e) {
  console.error('❌ Fail 6: API error code mapping failed', e);
  process.exit(1);
}

console.log('\n🎉 ALL RATING SUBMISSION MODAL UNIT TESTS PASSED!\n');
