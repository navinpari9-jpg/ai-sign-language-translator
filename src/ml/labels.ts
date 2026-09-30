/**
 * Sign Language Scope and Vocabulary Definitions
 * Scope: American Sign Language (ASL)
 */

export const SUPPORTED_SIGN_LANGUAGE = 'ASL';

export const STATIC_SIGNS = [
  'HELLO',
  'THANK YOU',
  'PLEASE',
  'YES',
  'NO',
  'I LOVE YOU',
  'HELP',
  'WATER',
  'FRIEND',
  'GOOD',
  'MORE',
  'SORRY',
  'OK',
  'PEACE',
  'THUMBS UP',
] as const;

export const DYNAMIC_SIGNS = [
  'WHERE',
  'WHAT',
  'AGAIN',
  'MEET',
  'FINISH',
  'TIRED',
  'HAPPY',
] as const;

export const SIGN_MEANINGS: Record<string, string> = {
  HELLO: 'A greeting or welcoming acknowledgment',
  'THANK YOU': 'Expression of appreciation and gratitude',
  PLEASE: 'Polite expression when requesting assistance',
  YES: 'Affirmative response or agreement (nodding fist)',
  NO: 'Negative response or refusal (pinched fingers)',
  'I LOVE YOU': 'Expression of deep affection (I+L+Y handshape)',
  HELP: 'Assistance or aid request',
  WATER: 'Request or designation of water (W handshape at chin)',
  FRIEND: 'Companionship or ally (hooked index fingers)',
  GOOD: 'Positive approval or favorable state',
  MORE: 'Request for additional quantity (flattened O fingertips touching)',
  SORRY: 'Apology or regret (circular rub over chest)',
  OK: 'Agreement, acceptance, or satisfactory status (O-ring with fingers up)',
  PEACE: 'Peace symbol or number 2 (V-sign extended)',
  'THUMBS UP': 'Approval, satisfaction, or confirmation',
  UNKNOWN: 'Unrecognized gesture or ambiguous hand pose',
};

export type SupportedStaticSign = typeof STATIC_SIGNS[number];
export type SupportedDynamicSign = typeof DYNAMIC_SIGNS[number];
