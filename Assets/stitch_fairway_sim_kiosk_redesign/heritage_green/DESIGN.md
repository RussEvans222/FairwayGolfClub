---
name: Heritage Green
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c2c8c2'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8c928d'
  outline-variant: '#424844'
  surface-tint: '#b4ccbc'
  primary: '#b4ccbc'
  on-primary: '#203529'
  primary-container: '#2d4236'
  on-primary-container: '#96ae9e'
  inverse-primary: '#4d6356'
  secondary: '#f5ba92'
  on-secondary: '#4b270a'
  secondary-container: '#683f20'
  on-secondary-container: '#e5ac85'
  tertiary: '#e9c349'
  on-tertiary: '#3c2f00'
  tertiary-container: '#cca730'
  on-tertiary-container: '#4f3d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d0e8d7'
  primary-fixed-dim: '#b4ccbc'
  on-primary-fixed: '#0b1f15'
  on-primary-fixed-variant: '#364b3f'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#f5ba92'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#653d1e'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Work Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  label-md:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 24px
  margin-desktop: 64px
  container-max: 1200px
---

## Brand & Style

The design system establishes an atmosphere of an exclusive, member-only library or a high-end golf clubhouse. It targets an affluent demographic that values tradition, craftsmanship, and the tactile nature of luxury goods. 

The aesthetic is **Tactile & Premium**, blending a "Dark Mode" digital foundation with organic, physical textures. The UI should evoke the feeling of a heavy leather-bound book or a custom-made wood dashboard. It utilizes subtle grain textures, soft inner shadows to simulate debossed effects, and gold-leaf accents to create a sense of permanent, physical presence on the kiosk screen. High-quality imagery of wood grains and leather hides should be used as subtle background overlays to reinforce the "Fairway Golf Club" persona.

## Colors

The palette is rooted in the natural world of a championship golf course and the clubhouse interior.

- **Primary (Forest Green):** A deep, saturated green used for primary action backgrounds and status indicators.
- **Secondary (Cognac Leather):** A rich, warm brown used for secondary buttons, highlights, and tactile elements.
- **Tertiary (Gold Accent):** A metallic-inspired hue used sparingly for typography highlights, icons, and premium borders to signify importance and quality.
- **Neutral (Charcoal/Black):** The foundation of the UI. A dark charcoal (#121212) provides better depth for textures than pure black.
- **Accents:** Use a "Wood Grain" hex (#4A3728) for structural containers and dividers.

## Typography

This design system employs a classic high-contrast pairing. **Playfair Display** provides the sophisticated, editorial voice required for headlines, evoking the masthead of a golf journal. **Work Sans** provides the utilitarian clarity necessary for a functional kiosk, ensuring that data-rich information like tee times and scores remain highly legible.

For the kiosk environment, display sizes are generous to account for viewing distances. All labels use increased letter spacing and uppercase styling to mimic the embossed look of traditional signage.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy to maintain a focused, centered experience on the kiosk hardware. 

- **Desktop (Landscape Kiosk):** 12-column grid with wide margins to create a sense of "breathing room" and exclusivity. Content is often contained within a central "cabinet" or "plaque" structure.
- **Rhythm:** An 8px base unit drives all padding and margins. 
- **Touch Targets:** Minimum touch areas are 64px squared to accommodate ease of use while standing.
- **Alignment:** Headlines are typically centered for a formal, symmetrical appearance. Interactive elements are grouped in the lower two-thirds of the screen for ergonomic accessibility.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Tactile Textures** rather than standard drop shadows.

- **Surface Tiers:** The background is the deepest layer (Charcoal). Above it sit "Wood" or "Leather" panels. Interactive elements are either "Raised" (light top border, dark bottom border) or "Sunken" (inner shadow) to simulate physical toggle switches and buttons.
- **Bevels:** Use 1px inner highlights (#FFFFFF at 10% opacity) on the top edge of components to simulate light catching on a physical edge.
- **Scrims:** Soft, deep-green radial gradients are used behind active modals to maintain the brand palette even during focused tasks.

## Shapes

The shape language is conservative and structural. While corners are not sharp, the roundedness is kept to a "Soft" level (0.25rem) to maintain a feeling of handcrafted joinery rather than "bubbly" tech interfaces. Large action cards and main containers may use `rounded-lg` (0.5rem) to feel like finished wood plaques.

## Components

- **Premium Buttons:** These should feel "heavy." Primary buttons use the Forest Green background with a subtle Cognac Leather border. On press, they utilize an inner shadow to simulate being physically pressed into the kiosk frame.
- **Status Chips:** Use gold-tinted outlines with Playfair Display typography for a "VIP" status or "Member" designation.
- **Input Fields:** Styled as "recessed" leather panels. The background is slightly darker than the surface, with a 1px Gold border appearing only on focus.
- **Lists:** Items are separated by thin Wood-colored horizontal rules. Every list item should have a generous height (min 80px) to facilitate easy touch.
- **Cards:** Use a subtle wood-grain texture as a background overlay (5% opacity). A 1px gold "pinstripe" border can be used for featured content like "Pro Lessons" or "Special Events."