# Product Description Example

## How to Format Your Product Descriptions

The description will now automatically format plain text with proper sections and spacing!

---

## ✨ Plain Text Format (Easiest)

Just use double line breaks between paragraphs and end section names with a colon:

```
Green Treez THC Gummies have achieved Legendary status! The formulation of pure Delta 9 THC has been bolstered with an additional 5mg of THCp! This blend is designed for experienced users with a tolerance for a full body and mind experience! The gummies are the perfect size, big enough to cut into pieces, but not abnormally large. Enjoy the juicy, fruity flavors and the potent effects to follow!

Flavor Profile:

Delicious, sweet assorted fruit flavors without the hemp taste.

Effects:

The THC effects offer intense euphoria. Expect the onset to take slightly longer than usual with the THCp, which will also tend to offer longer lasting effects. Your dosage will alter the heaviness in the body and mind.

Serving Content:

20 Gummies per package. One gummy is 20mg Delta 9 THC and 5mg THCp

Ingredients:

Corn Syrup, Sugar, Pectin, Sodium Citrate, Citric Acid, Glycerin, Delta 9 THC Distillate, THCp Distillate, Live Resin, All Natural Flavors, All Natural Colors from Turmeric, Annato Seed, Spirulina, Black Currant Juice Concentrate, and Elderberries.
```

### Result:
This will automatically display as:

> **First paragraph** (intro)
> 
> **Flavor Profile:**
> 
> Delicious, sweet assorted fruit flavors...
> 
> **Effects:**
> 
> The THC effects offer intense euphoria...
> 
> *(etc.)*

---

## 🎯 HTML Format (Most Control)

For more control, use HTML:

```html
<p>Green Treez THC Gummies have achieved Legendary status! The formulation of pure Delta 9 THC has been bolstered with an additional 5mg of THCp!</p>

<h4>Flavor Profile:</h4>
<p>Delicious, sweet assorted fruit flavors without the hemp taste.</p>

<h4>Effects:</h4>
<p>The THC effects offer intense euphoria. Expect the onset to take slightly longer than usual with the THCp, which will also tend to offer longer lasting effects.</p>

<h4>Serving Content:</h4>
<p>20 Gummies per package. One gummy is 20mg Delta 9 THC and 5mg THCp</p>

<h4>Ingredients:</h4>
<p>Corn Syrup, Sugar, Pectin, Sodium Citrate, Citric Acid, Glycerin, Delta 9 THC Distillate, THCp Distillate, Live Resin, All Natural Flavors, All Natural Colors from Turmeric, Annato Seed, Spirulina, Black Currant Juice Concentrate, and Elderberries.</p>
```

---

## 📝 Key Rules for Plain Text

1. **Double line breaks** = New paragraph
   ```
   First paragraph.
   
   Second paragraph.
   ```

2. **Text ending with colon** = Section heading
   ```
   Flavor Profile:
   
   Description here.
   ```

3. **Keep headings short** (under 50 characters)
   ```
   ✅ Effects:
   ✅ Serving Content:
   ❌ This is a very long heading that won't be recognized:
   ```

---

## 🎨 What Happens Automatically

### Input (Plain Text):
```
Product intro paragraph.

Flavor Profile:

Delicious flavors.

Effects:

Great effects.
```

### Output (Rendered):
```html
<div class="product-description__content">
  <p>Product intro paragraph.</p>
  <h4>Flavor Profile:</h4>
  <p>Delicious flavors.</p>
  <h4>Effects:</h4>
  <p>Great effects.</p>
</div>
```

---

## 💾 Example Product Data

### JSON Format
```json
{
  "title": "FruitPhoria Live Resin Gummies",
  "excerpt": "Legendary status gummies with Delta 9 THC + THCp",
  "description": "Green Treez THC Gummies have achieved Legendary status! The formulation of pure Delta 9 THC has been bolstered with an additional 5mg of THCp!\n\nFlavor Profile:\n\nDelicious, sweet assorted fruit flavors without the hemp taste.\n\nEffects:\n\nThe THC effects offer intense euphoria. Expect the onset to take slightly longer than usual.\n\nServing Content:\n\n20 Gummies per package. One gummy is 20mg Delta 9 THC and 5mg THCp\n\nIngredients:\n\nCorn Syrup, Sugar, Pectin, Sodium Citrate, Citric Acid, Glycerin..."
}
```

### Database/CMS Input
```
Green Treez THC Gummies have achieved Legendary status!

Flavor Profile:

Delicious, sweet assorted fruit flavors.

Effects:

Intense euphoria with longer lasting effects.

Serving Content:

20 Gummies per package.

Ingredients:

Corn Syrup, Sugar, Pectin...
```

---

## ✅ Testing Your Formatting

### Good Example ✅
```
Product intro.

Section Name:

Section content.

Another Section:

More content.
```

**Result:** Clean, formatted sections

### Bad Example ❌
```
Product intro. Section Name: Section content. Another Section: More content.
```

**Result:** One long paragraph (hard to read)

---

## 🔧 Quick Fix for Existing Descriptions

If you have descriptions without formatting:

1. Add **double line breaks** between paragraphs
2. Put section names on their **own line** ending with **:**
3. Add a **blank line** after each section name

### Before:
```
Product info. Flavor Profile: Great taste. Effects: Amazing. Ingredients: List...
```

### After:
```
Product info.

Flavor Profile:

Great taste.

Effects:

Amazing.

Ingredients:

List...
```

---

## 📋 Common Sections Template

Copy and customize this template:

```
[Product Name] is [brief description highlighting key features and benefits].

Flavor Profile:

[Describe the taste, aroma, and flavor experience]

Effects:

[What users can expect - onset time, duration, experience level]

Potency:

[THC/CBD content, strength level, recommended dosage]

Serving Content:

[Package size, number of units, dosage per unit]

Usage Instructions:

[How to consume, best practices, timing recommendations]

Ingredients:

[Complete ingredient list]

Storage:

[How to store for optimal freshness]

Lab Testing:

[Third-party testing information, COA availability]
```

---

## 🎉 Summary

✅ Use **double line breaks** between paragraphs  
✅ End section names with **:**  
✅ Keep section names **short and clear**  
✅ Use **blank lines** generously  
✅ **Test your formatting** before publishing  

Result: Clean, readable, professional product descriptions! 📝✨

---

**Created**: August 29, 2026  
**Purpose**: Example formatting for product descriptions  
**File**: DynamicProduct.jsx (auto-formats descriptions)
