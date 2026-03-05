

## Plan: Connect HeroShowcase menu to feature descriptions below

**Problem**: The section has 8 large feature cards in a grid AND an interactive mockup widget — too much content. The feature cards duplicate what the mockup already shows.

**Solution**: Remove the cards grid entirely. Instead, pass the active section from HeroShowcase up to AppFeaturesSection, and display only the matching feature description below the mockup screen.

### Changes

1. **HeroShowcase.tsx** — Accept an `onSectionChange` callback prop. Call it whenever `activeSection` changes. Also need to add missing sections to the showcase menu (currently has 6: dashboard, biomarkers, trends, recommendations, assistant, profile; missing: analyses, state, prescriptions). Add all 8 sections to match the feature data.

2. **AppFeaturesSection.tsx**:
   - Add `useState` to track the active section
   - Pass `onSectionChange` to `HeroShowcase`
   - Replace the 4-column cards grid with a single feature description block that shows only the active feature's info (title, subtitle, description, badges, feature list)
   - Remove `FeatureCard` component entirely
   - The description block appears directly below the mockup with a smooth transition/animation

3. **Mapping**: Map HeroShowcase section IDs to appFeatures IDs. The showcase currently uses "dashboard" / "biomarkers" / "trends" / "recommendations" / "assistant" / "profile" — need to align with appFeatures which uses "dashboard" / "analyses" / "biomarkers" / "trends" / "state" / "assistant" / "recommendations" / "prescriptions". Will unify to use all 8 in both.

