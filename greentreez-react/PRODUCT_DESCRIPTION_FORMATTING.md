# Product Description Formatting Guide

## Overview
How to format product descriptions to create readable, well-structured content with proper sections and spacing.

---

## ✨ Result

Your descriptions will look like this:

```
Green Treez THC Gummies have achieved Legendary status! The formulation of pure Delta 9 THC has been bolstered with an additional 5mg of THCp! This blend is designed for experienced users with a tolerance for a full body and mind experience!

Flavor Profile:

Delicious, sweet assorted fruit flavors without the hemp taste.

Effects:

The THC effects offer intense euphoria. Expect the onset to take slightly longer than usual with the THCp, which will also tend to offer longer lasting effects.

Serving Content:

20 Gummies per package. One gummy is 20mg Delta 9 THC and 5mg THCp

Ingredients:

Corn Syrup, Sugar, Pectin, Sodium Citrate...
```

---

## 📝 How to Format Descriptions

### Method 1: Using Bold Text (Recommended)

Use `**Section Name:**` to create section headings:

```html
Green Treez THC Gummies have achieved Legendary status! The formulation of pure Delta 9 THC has been bolstered with an additional 5mg of THCp!

**Flavor Profile:**

Delicious, sweet assorted fruit flavors without the hemp taste.

**Effects:**

The THC effects offer intense euphoria. Expect the onset to take slightly longer than usual.

**Serving Content:**

20 Gummies per package. One gummy is 20mg Delta 9 THC and 5mg THCp

**Ingredients:**

Corn Syrup, Sugar, Pectin, Sodium Citrate, Citric Acid, Glycerin...
```

### Method 2: Using HTML Headings

```html
<p>Green Treez THC Gummies have achieved Legendary status! The formulation of pure Delta 9 THC has been bolstered with an additional 5mg of THCp!</p>

<h3>Flavor Profile:</h3>
<p>Delicious, sweet assorted fruit flavors without the hemp taste.</p>

<h3>Effects:</h3>
<p>The THC effects offer intense euphoria. Expect the onset to take slightly longer than usual.</p>

<h3>Serving Content:</h3>
<p>20 Gummies per package. One gummy is 20mg Delta 9 THC and 5mg THCp</p>

<h3>Ingredients:</h3>
<p>Corn Syrup, Sugar, Pectin, Sodium Citrate, Citric Acid, Glycerin...</p>
```

---

## 🎨 Styling Applied

### Automatic Formatting

The description area automatically styles:

✅ **Section Headings** (bold text or h3/h4)
- Dark color (`#111827`)
- Bold font (700 weight)
- Top margin for separation
- Bottom margin before content

✅ **Paragraphs**
- Proper line spacing (1.8)
- Bottom margin (1.25rem)
- Readable color (`#374151`)

✅ **Lists**
- Proper indentation
- Spaced items
- Clean bullets/numbers

✅ **Links**
- Green color (`#059669`)
- Underlined
- Hover effect

---

## 📐 Spacing System

```css
Section Heading → 1.75rem top margin
                  0.75rem bottom margin

Paragraph      → 1.25rem bottom margin

Lists          → 0.75rem top/bottom margin
                 0.5rem between items
```

---

## 💡 Best Practices

### DO ✅

1. **Use Blank Lines**
   ```
   First paragraph.

   Second paragraph.
   ```

2. **Create Clear Sections**
   ```
   **Section Name:**

   Content for that section.
   ```

3. **Keep Sections Short**
   - 1-3 sentences per section
   - Easy to scan

4. **Use Descriptive Headings**
   - Flavor Profile
   - Effects
   - Ingredients
   - Serving Content
   - Usage Instructions
   - Storage

5. **Break Up Long Text**
   - Use bullet points
   - Multiple paragraphs
   - Sections

### DON'T ❌

1. **Write One Long Paragraph**
   ```
   ❌ Everything in one block with no breaks or sections...
   ```

2. **Skip Section Labels**
   ```
   ❌ Just listing information without headers
   ```

3. **Use ALL CAPS**
   ```
   ❌ FLAVOR PROFILE: DELICIOUS...
   ✅ Flavor Profile: Delicious...
   ```

4. **Forget Blank Lines**
   ```
   ❌ Section:
   Content immediately with no space
   ```

---

## 📋 Common Sections

### For Edibles/Gummies

```
**Product Overview:**
Brief intro about the product

**Flavor Profile:**
Taste and flavor description

**Effects:**
What to expect when using

**Serving Content:**
How many per package, dosage

**Ingredients:**
Full ingredient list

**Usage Instructions:**
How to consume

**Storage:**
How to store the product
```

### For Flower/Pre-Rolls

```
**Product Overview:**
Brief intro

**Strain Information:**
Indica/Sativa/Hybrid details

**Aroma & Flavor:**
Terpene profile, taste

**Effects:**
Expected experience

**THC/CBD Content:**
Cannabinoid percentages

**Cultivation:**
Growing method, source
```

### For Concentrates

```
**Product Overview:**
Brief intro

**Extraction Method:**
How it's made

**Potency:**
THC/CBD levels

**Terpene Profile:**
Flavors and aromas

**Suggested Use:**
How to consume

**Effects:**
Expected experience
```

---

## 🎯 Example Templates

### Template 1: Full HTML

```html
<p>Introductory paragraph about the product. Highlight key features and benefits that make it special.</p>

<h3>Flavor Profile:</h3>
<p>Description of taste and flavor experience.</p>

<h3>Effects:</h3>
<p>What users can expect when consuming this product.</p>

<h3>Serving Content:</h3>
<p>Package contents and dosage information.</p>

<h3>Ingredients:</h3>
<p>Complete list of ingredients used in the product.</p>
```

### Template 2: Markdown Style

```markdown
Product intro paragraph with key highlights.

**Flavor Profile:**

Taste and flavor description.

**Effects:**

Expected experience and onset timing.

**Serving Content:**

Package size and dosage details.

**Ingredients:**

Full ingredient list.
```

### Template 3: With Lists

```html
<p>Product overview paragraph.</p>

<h3>Key Features:</h3>
<ul>
  <li>Feature 1 description</li>
  <li>Feature 2 description</li>
  <li>Feature 3 description</li>
</ul>

<h3>Effects:</h3>
<p>Main effects paragraph.</p>

<h3>Ingredients:</h3>
<p>Ingredient list...</p>
```

---

## 🔧 In Admin/CMS

When adding products, format the description field like this:

### Plain Text Input
```
Product intro paragraph.

**Section 1:**

Content for section 1.

**Section 2:**

Content for section 2.
```

### HTML Editor
```html
<p>Product intro paragraph.</p>

<h3>Section 1:</h3>
<p>Content for section 1.</p>

<h3>Section 2:</h3>
<p>Content for section 2.</p>
```

---

## ✨ Additional Formatting

### Bullet Lists
```html
<h3>Features:</h3>
<ul>
  <li>Feature 1</li>
  <li>Feature 2</li>
  <li>Feature 3</li>
</ul>
```

### Numbered Lists
```html
<h3>Usage Instructions:</h3>
<ol>
  <li>Step 1</li>
  <li>Step 2</li>
  <li>Step 3</li>
</ol>
```

### Important Notes
```html
<blockquote>
  <strong>Important:</strong> Start with a low dose and wait 60-90 minutes before consuming more.
</blockquote>
```

### Tables (for specifications)
```html
<h3>Product Specifications:</h3>
<table>
  <tr>
    <th>Attribute</th>
    <th>Value</th>
  </tr>
  <tr>
    <td>THC Content</td>
    <td>25mg per gummy</td>
  </tr>
  <tr>
    <td>Package Size</td>
    <td>20 gummies</td>
  </tr>
</table>
```

---

## 📱 Mobile Optimization

The formatting automatically adjusts for mobile:
- Smaller fonts
- Adjusted spacing
- Maintains readability
- Proper line breaks

---

## 🎉 Summary

To create well-formatted descriptions:

1. ✅ **Use section headings** (bold or h3/h4)
2. ✅ **Add blank lines** between sections
3. ✅ **Break up content** into digestible chunks
4. ✅ **Keep paragraphs short** (2-4 sentences)
5. ✅ **Use lists** for multiple items
6. ✅ **Be consistent** across all products

Result: Clean, scannable, professional product descriptions! 📝✨

---

**Created**: August 29, 2026  
**Purpose**: Guide for formatting readable product descriptions  
**Related**: DESCRIPTION_PLACEMENT.md
