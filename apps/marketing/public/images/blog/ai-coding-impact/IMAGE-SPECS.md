# Image Specifications for "What to Document as a Developer When AI Writes Your Code"

This blog post requires 3 images total:

## 1. Hero Image (ALREADY EXISTS)
**Filename:** `ai-coding-impact-hero.svg`
**Dimensions:** 1200x630px (Open Graph standard)
**Description:** Developer working alongside AI coding assistant, showing human strategic decisions overlaying automated code generation
**Status:** ✅ Referenced in frontmatter

---

## 2. Before/After Comparison Graphic ⭐ NEEDS CREATION
**Filename:** `before-after-comparison.svg`
**Location in post:** After line 56 (after the Before/After example)
**Dimensions:** 1000x600px
**Purpose:** Visual comparison of weak vs. strong documentation

### Layout:
Two-column design with clear "BEFORE" and "AFTER" labels

### LEFT COLUMN (Before - Weak Documentation):
**Background:** Light red/pink (#FEF2F2)
**Border:** Red (#DC2626)

**Content:**
```
BEFORE

"Used GitHub Copilot to write authentication system.
Shipped in 2 weeks."
```

**Visual indicators:**
- ❌ icon or red X
- Minimal text
- No metrics
- No context
- No business impact

### RIGHT COLUMN (After - Strong Documentation):
**Background:** Light green (#F0FDF4)
**Border:** Green (#10B981)

**Content:**
```
AFTER

"Architected authentication system that supports SSO, SAML,
and future OAuth providers. Used GitHub Copilot to generate
boilerplate and test cases. This reduced implementation from
6 weeks to 2 weeks. Time saved allowed team to also implement
audit logging. This unblocked 3 enterprise deals worth $1800 MRR.
Design decisions documented in RFC. Now used as template for
other system designs."
```

**Visual indicators:**
- ✓ icon or green checkmark
- Callout bubbles highlighting:
  - "6 weeks → 2 weeks" (time metric)
  - "$1800 MRR" (business impact)
  - "3 enterprise deals" (outcomes)
  - "RFC template" (force multiplication)

### Arrow Between Columns:
Large arrow pointing from left to right with text: "Document decisions + impact"

---

## 3. Five-Step Pattern Infographic ⭐ NEEDS CREATION
**Filename:** `five-step-pattern.svg`
**Location in post:** After line 142 (after "The Pattern" section)
**Dimensions:** 1000x400px
**Purpose:** Visual diagram of the Evidence + Context + Outcomes pattern

### Layout:
Horizontal flow diagram with 5 connected steps

### Step 1: CONTEXT
**Icon:** Question mark or lightbulb
**Color:** Blue (#3B82F6)
**Text:**
```
1. CONTEXT
What was the problem
or opportunity?
```

### Step 2: DECISION
**Icon:** Path fork or decision tree
**Color:** Purple (#8B5CF6)
**Text:**
```
2. YOUR CONTRIBUTION
What did you decide
and why?
```

### Step 3: AI ASSISTANCE
**Icon:** Robot or AI symbol
**Color:** Orange (#F97316)
**Text:**
```
3. AI AMPLIFICATION
How did AI tools
help execute?
```

### Step 4: OUTCOMES
**Icon:** Chart trending up
**Color:** Green (#10B981)
**Text:**
```
4. EVIDENCE
What measurable
outcomes resulted?
```

### Step 5: FORCE MULTIPLICATION
**Icon:** Network or radiating lines
**Color:** Pink (#EC4899)
**Text:**
```
5. SECOND-ORDER IMPACT
What became easier
for others?
```

### Connecting Elements:
- Right-pointing arrows between each step
- Flow should be left-to-right
- Each step should be equal width
- Visual consistency with rounded rectangles or cards

---

## Design Guidelines for All Images

### Brand Colors:
- Primary Blue: #3B82F6
- Success Green: #10B981
- Warning Red: #DC2626
- Neutral Gray: #64748B
- Background: #F8FAFC

### Typography:
- Font: system-ui, -apple-system, sans-serif
- Headers: 18-24px, bold
- Body text: 12-14px, regular
- Use dark text (#0F172A) on light backgrounds

### Style:
- Clean, modern, minimalist
- Plenty of white space
- Rounded corners (8px border-radius)
- Subtle shadows for depth
- Icons should be simple and recognizable

### Accessibility:
- Ensure sufficient color contrast (WCAG AA minimum)
- Don't rely solely on color to convey meaning
- Include text labels with all icons
- Alt text already provided in markdown

---

## File Format Requirements

- **Format:** SVG (vector) preferred for scalability
- **Fallback:** PNG at 2x resolution if SVG not possible
- **Compression:** Optimize for web (target <200KB per image)
- **Export:** Ensure fonts are converted to paths/outlines

---

## Priority

1. **Hero image:** ✅ Already exists
2. **Before/After comparison:** 🔴 HIGH PRIORITY - directly illustrates the core concept
3. **Five-step pattern:** 🟡 MEDIUM PRIORITY - reinforces the framework

Both new images should be created before publication.
