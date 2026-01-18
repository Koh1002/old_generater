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

  const prompt = `Create a photorealistic portrait of this EXACT same person at age ${targetAge} (currently ${photoAge} years old).

🎯 CRITICAL: IDENTITY PRESERVATION (HIGHEST PRIORITY)
- This MUST be the SAME PERSON with 100% facial feature consistency
- Preserve EVERY unique characteristic that makes this person identifiable
- Think of this as showing the same person at a different age, NOT creating a different person
- The viewer should instantly recognize this as the same individual

📸 FACIAL FEATURES TO PRESERVE EXACTLY:
- Face shape and bone structure (jaw, cheekbones, forehead, chin)
- Eye shape, size, spacing, and color
- Eyebrow shape and arch
- Nose bridge, width, and tip shape
- Mouth width and lip shape
- Ear shape and position
- Facial proportions and symmetry
- Any distinctive marks, moles, or features
- Gender presentation and characteristics

⏰ AGE TRANSFORMATION (${photoAge} → ${targetAge}):
${ageSpecificChanges}

✅ WHAT TO CHANGE (Age-related only):
- Skin texture: wrinkles, fine lines, age spots appropriate for ${targetAge}
- Skin elasticity and facial volume changes
- Hair: natural color changes (greying/whitening), density, texture for age ${targetAge}
- Subtle changes in facial fullness/sagging consistent with aging
- Eye area: crow's feet, under-eye changes appropriate for age

❌ WHAT NOT TO CHANGE:
- Core facial structure and bone features
- Eye color and fundamental eye shape
- Nose structure
- Mouth and lip fundamental shape
- Facial proportions
- Gender characteristics
- Hairstyle (except natural age-related changes)
- Background (keep simple and similar)

🎨 STYLE REQUIREMENTS:
- Photorealistic, high-quality portrait
- Natural lighting
- Clear, sharp focus on face
- Professional headshot composition
- Neutral or softly blurred background

The final image must make viewers say "That's clearly the same person, just ${targetAge} years old" - NOT "That's a different person."`;

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
    // Gemini configuration (Nano Banana)
    return {
      candidateCount: 1,
      temperature: 0.3, // Lower temperature for better identity preservation
    };
  }
}
