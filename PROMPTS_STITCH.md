# PROMPTS GOOGLE STITCH — AFRIK'ART INNOVATION GALLERY

## Mode d'emploi
1. Colle d'abord le **Prompt 0 (direction artistique + hall d'entrée)**. Joins tes 2 photos d'inspiration (borne tactile + salle d'écrans dans le noir) comme référence visuelle.
2. Ensuite, **un écran par prompt** (1 → 9), dans le même projet Stitch, en commençant chaque prompt par : *« Keep the exact same design system as the previous screens. »*
3. Pour les retouches : **un seul changement par prompt** (ou l'annotation directe sur l'écran).
4. Les prompts sont en anglais (vocabulaire UI plus précis), mais tous les textes de l'interface sont demandés **en français**.
5. Stitch produit des écrans fixes : la 3D et les transitions sont ici *suggérées* visuellement (perspective, profondeur, flou). Le mouvement réel sera fait dans le code.

---

## PROMPT 0 — Direction artistique + Hall d'entrée (desktop)

```
Design the entrance hall screen of "AFRIK'ART INNOVATION GALLERY", a digital art gallery web app that feels like walking into a real contemporary art museum, not like scrolling a website. Platform: responsive web, desktop first. All UI text in French.

DESIGN SYSTEM (apply to every future screen):
- Mood: hushed, cinematic, museum at night. The artworks are the only vivid colors; the interface stays quiet and recedes.
- Background: deep charcoal near-black (#0E0E10) with a very soft radial spotlight glow; secondary light theme "musée blanc" (#F4F2EE) for later.
- Accent: a single warm ochre/terracotta accent (#C8742C) used sparingly for active states and primary buttons. Subtle thin gold-ochre hairlines for dividers.
- Typography: elegant high-contrast serif for titles (gallery catalogue style), clean geometric sans-serif for UI and labels. Generous letter-spacing on small uppercase labels.
- Artwork labels look like real museum wall labels ("cartels"): small, left-aligned, title in serif italic, artist name, year, technique, price in FCFA when for sale.
- Lots of negative space, no cards with heavy shadows, no gradients on buttons, rounded corners very small (4px). Icons: thin line icons.
- Persistent minimal top bar: logo wordmark left, center empty, right: search icon (with "⌘K" hint), "Plan de la galerie" icon, toggle "Visite 3D / Visite légère", user avatar or "Connexion".

HALL SCREEN CONTENT:
- Full-screen dark hall seen in perspective: a large wall facing the visitor with the current exhibition title projected on it: "Exposition en cours — Lumières d'Afrique", dates "23 – 27 novembre 2026", one line of curatorial text.
- Below, 4 featured artworks hung in a row on the wall like real framed canvases, each lit by a soft spotlight cone from above, each with a small cartel underneath (e.g. "Le Gardien du fleuve — Aïcha Mbarga, 2025, acrylique sur toile, 450 000 FCFA").
- A single large primary button centered at the bottom: "Entrer dans la galerie →", with a small hint underneath: "Utilisez ← → ou glissez pour vous déplacer".
- Polished concrete floor with faint reflections of the lit artworks.
- No scrolling: everything fits in one viewport.
```

---

## PROMPT 1 — Salle d'exposition, vue d'ensemble (mode « Visite légère » 2.5D)

```
Keep the exact same design system as the previous screens.
Design the main exhibition room screen, desktop. This is the heart of the app: the visitor stands in a gallery room and moves wall to wall, never scrolls.

- Full-viewport view of a dark gallery room in one-point perspective: the main wall in front with 3 artworks of different sizes and ratios (one large vertical portrait, one square, one horizontal), side walls visible in perspective on the left and right showing the next artworks slightly blurred, suggesting depth.
- Each artwork lit by a soft spotlight, with a cartel underneath.
- Large semi-transparent circular arrows at the far left and far right edges ("Mur précédent", "Mur suivant").
- Bottom center: a slim progress indicator "Salle 1 · Mur 2 / 4" with 4 small dots.
- Bottom left: small breadcrumb "Lumières d'Afrique › Salle 1 — Portraits".
- Bottom right: a mini-map button showing a tiny floor plan thumbnail.
- No text blocks, no lists: the room is the interface.
```

---

## PROMPT 2 — Focus sur une œuvre + panneau d'information (desktop)

```
Keep the exact same design system as the previous screens.
Design the artwork focus state, desktop: the camera has moved close to one artwork.

- Left 62% of the screen: the artwork, large, centered, framed, on the dark wall with a spotlight; the rest of the room is darkened and softly blurred behind.
- Small zoom controls floating at the bottom of the artwork ("+", "−", "Plein écran").
- Right 38%: a calm side panel sliding over the room, dark translucent with a thin ochre hairline on its left edge. Content in order:
  - Small uppercase label "SALLE 1 · ŒUVRE 3 / 12"
  - Title in large serif italic: "Le Gardien du fleuve"
  - Artist row: round avatar + "Aïcha Mbarga" + link "Voir l'artiste"
  - Facts grid: Année 2025 · Technique Acrylique sur toile · Dimensions 120 × 90 cm · Collection "Eaux sacrées"
  - Short description paragraph (3 lines)
  - Price block: "450 000 FCFA" with a small badge "Disponible" and secondary line "≈ 686 € · ≈ 750 $ (indicatif)"
  - Primary button "Je suis intéressé·e", secondary button "Contacter l'artiste"
  - Action row: heart icon with "128", comment icon with "14", share icon, QR code icon
  - Comments preview: 2 short comments with avatar, name, date, then "Voir les 14 commentaires"
- Panel close button "×" top right, and arrows "‹ Œuvre précédente / Œuvre suivante ›" at the bottom of the panel.
```

---

## PROMPT 3 — Version mobile de la visite (salle + focus)

```
Keep the exact same design system as the previous screens.
Design 2 mobile screens (portrait, 390px wide) of the gallery visit, made for a mid-range Android phone.

Screen A — Room on mobile: one artwork at a time on the dark wall, centered, filling ~65% of the height, with spotlight and cartel. Faint edges of the previous and next artworks visible on the left and right to invite swiping. Top: minimal bar with logo, search icon, plan icon. Bottom: "Salle 1 · 3 / 12" with dots, and a hint "Glissez pour avancer".

Screen B — Focus on mobile: the artwork in the top 45%, and a bottom sheet with a drag handle covering the lower 55% containing the same information as the desktop panel (title, artist, facts, price "450 000 FCFA — Disponible", buttons "Je suis intéressé·e" and "Contacter", like/comment/share row). Large touch targets, thumb-friendly.
```

---

## PROMPT 4 — Plan de la galerie + palette de recherche

```
Keep the exact same design system as the previous screens.
Design 2 overlay screens, desktop, displayed over the dimmed gallery room.

Screen A — "Plan de la galerie": a centered architectural floor plan drawn in thin ochre lines on dark, top view, with 3 rooms ("Salle 1 — Portraits", "Salle 2 — Eaux sacrées", "Salle 3 — Villes vivantes"). Each wall shows tiny artwork thumbnails at their real position. A pulsing dot "Vous êtes ici". Hovering a room highlights it. Bottom: "Cliquez sur une œuvre pour vous y rendre".

Screen B — Search palette: a centered command-palette style modal (like Spotlight), large input "Rechercher une œuvre, un artiste, une collection…", results grouped in 3 sections "Artistes", "Œuvres", "Collections", each result with a small thumbnail, name and subtitle; an "Exposée en Salle 2" tag on works currently in the exhibition. Keyboard hints at the bottom "↑↓ naviguer · ↵ ouvrir · Échap fermer".
```

---

## PROMPT 5 — Mur de l'artiste (profil public)

```
Keep the exact same design system as the previous screens.
Design the public artist page, desktop, presented as the artist's personal wall in the gallery, not as a scrolling profile.

- Left third: a portrait photo of the artist in a soft spotlight, name "Aïcha Mbarga" in large serif, "Peintre · Douala, Cameroun", a 4-line bio, social links, button "Contacter l'artiste", stats "24 œuvres · 3 collections · 1 exposition".
- Right two thirds: a gallery wall with her works hung in a salon-style arrangement (different sizes), with left/right arrows to move along the wall.
- Above the wall, tabs styled like small uppercase labels: "Toutes les œuvres", "Collections", "Œuvres solo", "En vente".
```

---

## PROMPT 6 — Studio de l'artiste (tableau de bord)

```
Keep the exact same design system as the previous screens, but this is a work tool: denser, clear and functional, still dark and elegant.
Design the artist studio dashboard, desktop.

- Left sidebar: "Tableau de bord", "Mes œuvres", "Collections", "Propositions d'exposition", "Messages" (with a badge "3"), "Commentaires", "Profil".
- Main area: greeting "Bonjour Aïcha", 4 small stat tiles (Vues 1 240, J'aime 312, Messages 3 non lus, Œuvres en vente 9).
- A grid of her artworks as thumbnails with status chips ("Publiée", "Brouillon", "Proposée à l'expo", "Validée", "Vendue") and a quick edit icon.
- Primary button top right "+ Ajouter une œuvre".
```

---

## PROMPT 7 — Ajouter / modifier une œuvre (studio)

```
Keep the exact same design system as the previous screens.
Design the "Ajouter une œuvre" form screen, desktop, in two columns.

- Left column: large drag-and-drop upload zone "Glissez votre image ici (JPG, PNG, WebP — 20 Mo max)"; once uploaded, a preview titled "Aperçu au mur" showing the artwork hung on a dark gallery wall at real proportions with a spotlight.
- Right column: fields "Titre", "Description", "Année", "Technique", "Dimensions (cm)", select "Collection" with option "Aucune — œuvre solo", toggle "Mettre en vente", then "Prix (FCFA)" and select "Statut" (Disponible, Réservée, Vendue), toggle "Publier".
- Bottom bar: "Enregistrer le brouillon" (secondary) and "Publier l'œuvre" (primary).
```

---

## PROMPT 8 — Admin : éditeur de salle d'exposition

```
Keep the exact same design system as the previous screens, functional admin tool.
Design the admin exhibition room editor, desktop.

- Top: exhibition title "Lumières d'Afrique", dates, status badge "En cours", buttons "Prévisualiser la visite" and "Publier".
- Left panel "Œuvres proposées": list of artwork thumbnails with artist name and two small buttons "Valider" / "Refuser"; tab "Validées" next to it.
- Center: the room "Salle 1 — Portraits" shown as an unfolded room: 4 walls laid flat side by side (Nord, Est, Sud, Ouest), each wall a dark rectangle where validated artworks are placed at scale; drag handles on artworks, dashed drop zones.
- Right panel: room settings (name, ambiance "Nuit" / "Musée blanc", order), and the list of rooms with "+ Ajouter une salle".
- Secondary admin nav in a left rail: "Demandes d'artistes" (badge 5), "Expositions", "Œuvres mises en avant", "Modération".
```

---

## PROMPT 9 — Mode borne (salon physique) + cartel imprimable

```
Keep the exact same design system as the previous screens.
Design 2 screens for the physical exhibition booth.

Screen A — Kiosk mode, 1920×1080 touchscreen on a stand: very large touch targets, no top bar, no login. Center: the current exhibition's artworks in a large horizontal row on a dark wall, one in focus with its cartel; huge arrows left/right; bottom: big buttons "Explorer les salles", "Les artistes", "Rechercher". Corner: QR code "Continuez la visite sur votre téléphone".

Screen B — Printable artwork label (A6 card, light background #F4F2EE, for placing next to the physical artwork): title in serif italic, artist, year, technique, dimensions, price in FCFA, a large QR code, and the line "Scannez pour voir l'œuvre, l'artiste et la contacter". Gallery logo at the bottom.
```

---

## Retouches utiles (un prompt à la fois)
- `Make the spotlights on the artworks softer and warmer.`
- `Switch this screen to the light "musée blanc" theme: walls #F4F2EE, text charcoal, keep the ochre accent.`
- `Increase the size of the artwork; the interface must take less space than the art.`
- `Translate all remaining English text to French.`
