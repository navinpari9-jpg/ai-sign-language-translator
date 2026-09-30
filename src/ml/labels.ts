/**
 * Sign Language Scope and Vocabulary Definitions
 * Scope: American Sign Language (ASL)
 */

export const SUPPORTED_SIGN_LANGUAGE = 'ASL';

// Signs with direct model and feature verification support
export const SUPPORTED_SIGNS = [
  'WATER',
  'NO',
  'YES',
  'HELLO',
  'HELP',
  'GOOD',
  'LOVE',
  'OK',
  'PEACE',
  'SORRY',
] as const;

export const STATIC_SIGNS = [
  'WATER',
  'NO',
  'LOVE',
  'OK',
  'PEACE',
  'THUMBS UP',
] as const;

export const DYNAMIC_SIGNS = [
  'HELLO',
  'THANK YOU',
  'PLEASE',
  'YES',
  'HELP',
  'GOOD',
  'SORRY',
  'J',
  'Z',
] as const;

export const SIGN_MEANINGS: Record<string, string> = {
  HELLO: 'A greeting or welcoming acknowledgment (salute outward from temple)',
  'THANK YOU': 'Expression of appreciation (forward movement from chin)',
  PLEASE: 'Polite expression when requesting assistance (circular motion over chest)',
  YES: 'Affirmative response (fist nodding up and down from wrist)',
  NO: 'Negative response or refusal (index and middle snap onto thumb)',
  'I LOVE YOU': 'Expression of affection (thumb, index, and pinky extended)',
  LOVE: 'Expression of affection (I-L-Y handshape)',
  HELP: 'Assistance or aid request (thumbs-up on open flat palm, lifted together)',
  WATER: 'Water designation (W handshape tapping chin)',
  FRIEND: 'Companionship or ally (interlocking index fingers)',
  GOOD: 'Positive approval (hand moves from chin to resting palm)',
  MORE: 'Request for additional quantity (fingertips tapping together)',
  SORRY: 'Apology or regret (fist rubbing circles on chest)',
  OK: 'Agreement or satisfactory status (thumb & index circle with 3 fingers up)',
  PEACE: 'Peace symbol or number 2 (V-handshape extended)',
  'THUMBS UP': 'Approval, satisfaction, or confirmation',
  UNKNOWN: 'Unrecognized gesture or ambiguous hand posture',
};

export type SupportedStaticSign = typeof STATIC_SIGNS[number];
export type SupportedDynamicSign = typeof DYNAMIC_SIGNS[number];
