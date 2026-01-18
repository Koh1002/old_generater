/**
 * Generates a prompt for age transformation image generation
 *
 * Key requirements:
 * - Maintain person identity (facial features, structure, expression)
 * - Only change age-related characteristics
 * - Avoid unnecessary decorative changes
 * - Keep background simple or similar to original
 */
export function generateImagePrompt(photoAge: number, targetAge: number): string {
  const ageDifference = targetAge - photoAge;
  const isAging = ageDifference > 0;
  const direction = isAging ? 'older' : 'younger';

  let ageSpecificChanges = '';

  if (isAging) {
    // Aging transformation
    if (ageDifference <= 10) {
      ageSpecificChanges = `Subtle signs of aging: slight skin texture changes, very fine lines around eyes and mouth, minimal changes to facial structure. Keep the overall appearance very close to the original.`;
    } else if (ageDifference <= 20) {
      ageSpecificChanges = `Moderate aging: natural wrinkles around eyes, forehead, and mouth; slight changes in skin elasticity; possible minor changes in facial volume; some grey hair if appropriate for the age. Maintain facial structure and features.`;
    } else if (ageDifference <= 30) {
      ageSpecificChanges = `Advanced aging: deeper wrinkles and lines; noticeable skin texture changes; age spots or minor skin imperfections; reduced facial volume in some areas; grey or white hair; slight changes to facial contours while preserving identity.`;
    } else {
      ageSpecificChanges = `Significant aging to ${targetAge} years old: pronounced wrinkles and deep facial lines; substantial skin texture changes; age-appropriate grey or white hair; changes in facial volume and elasticity; possible slight changes to facial shape while clearly maintaining the person's core facial identity.`;
    }
  } else {
    // Rejuvenation transformation
    const absDiff = Math.abs(ageDifference);
    if (absDiff <= 10) {
      ageSpecificChanges = `Subtle rejuvenation: smoother skin texture, reduced fine lines, slightly improved skin elasticity. Keep the overall appearance very close to the original.`;
    } else if (absDiff <= 20) {
      ageSpecificChanges = `Moderate rejuvenation: smoother skin, reduced wrinkles, improved facial volume, fuller hair if age-appropriate. Maintain all distinctive facial features.`;
    } else {
      ageSpecificChanges = `Significant rejuvenation to ${targetAge} years old: much smoother skin, minimal wrinkles, youthful facial volume, age-appropriate hair color and volume. Preserve all core facial features and identity.`;
    }
  }

  const prompt = `Transform this person's appearance to look exactly ${targetAge} years old (currently ${photoAge} years old).

CRITICAL REQUIREMENTS:
- Maintain the EXACT same person identity: preserve all distinctive facial features, face shape, eye shape, nose structure, mouth shape, and overall facial proportions
- ONLY change age-related characteristics - do NOT alter hairstyle, hair color (except natural greying with age), or add accessories
- Keep the background simple and similar to the original, or use a plain neutral background
- Ensure the transformation looks natural and realistic for the target age

AGE-SPECIFIC CHANGES:
${ageSpecificChanges}

WHAT TO PRESERVE:
- Facial bone structure and proportions
- Eye shape, color, and placement
- Nose structure
- Mouth shape and lip proportions
- Ear shape and placement
- Overall facial width and length ratios
- Distinctive facial characteristics
- Hairstyle (except for natural changes in volume/density with age)

WHAT TO CHANGE:
- Skin texture and wrinkles appropriate for ${targetAge} years old
- Facial volume and elasticity appropriate for the age
- Natural hair color changes if aging significantly (greying)
- Age-appropriate skin tone and texture

The result should clearly be the same person, just at age ${targetAge}.`;

  return prompt;
}

/**
 * Generates additional guidance for the image model
 */
export function getImageGenerationConfig(provider: 'openai' | 'gemini') {
  if (provider === 'openai') {
    return {
      quality: 'hd' as const,
      size: '1024x1024' as const,
      style: 'natural' as const,
    };
  } else {
    // Gemini configuration
    return {
      candidateCount: 1,
      temperature: 0.4, // Lower temperature for more consistent results
    };
  }
}
