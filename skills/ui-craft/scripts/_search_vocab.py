"""Vocabulary tables for search.py: stopwords, domain routing, generic words, synonyms.

Not a CLI. Plain data so search.py stays short; edit here to tune query understanding.
"""

STOPWORDS = frozenset(
    "a an the for with and or of to in on my i me that need want using use some like "
    "component".split())

ROUTES = (  # checked in order; first hit wins
    ("fonts", frozenset("font typeface typography typographic serif sans monospace".split())),
    ("palettes", frozenset("palette color colour scheme swatch".split())),
    ("libraries", frozenset("library kit framework".split())),  # "smooth scroll library"
    ("sections", frozenset("section chapter homepage sitemap archetype beat".split())),
    ("motion", frozenset("animation scroll transition parallax reveal motion stagger easing "
                         "keyframe scrollytelling".split())),
)

# words naming the kind of thing wanted; they score but aren't required to match
GENERIC_WORDS = frozenset("animation animated motion effect component library kit framework "
                          "font typeface palette color colour ui element widget".split())

# Domains searched with taste / brief vocabulary: any matching word qualifies (score x coverage).
TASTE_DOMAINS = ("palettes", "fonts", "sections")

# One-way query expansion: a query word also matches these words (at a discount).
# Keys and values are single tokens in singular form. Keep entries specific: a synonym widens
# matching, so a loose one can turn an honest "no match" into a misleading result.
SYNONYMS = {
    # mood / taste
    "handmade": ("crafted", "artisan", "handcrafted"),
    "handcrafted": ("crafted", "artisan"),
    "artisanal": ("artisan", "crafted"),
    "ceramic": ("crafted", "earthy", "artisan"),
    "pottery": ("crafted", "earthy", "artisan"),
    "clay": ("earthy", "crafted"),
    "calm": ("quiet", "serene", "minimal"),
    "serene": ("calm", "quiet"),
    "peaceful": ("calm", "quiet", "serene"),
    "modern": ("contemporary", "clean"),
    "contemporary": ("modern", "clean"),
    "minimalist": ("minimal", "clean"),
    "luxury": ("premium", "elegant"),
    "luxurious": ("luxury", "premium", "elegant"),
    "premium": ("luxury", "elegant"),
    "elegant": ("refined", "luxury"),
    "sophisticated": ("refined", "elegant"),
    "playful": ("fun", "friendly"),
    "fun": ("playful", "friendly"),
    "techy": ("technical", "developer"),
    "tech": ("technical", "developer"),
    "cozy": ("warm", "soft"),
    "organic": ("natural", "earthy"),
    "corporate": ("enterprise", "professional"),
    "professional": ("corporate", "trustworthy"),
    "trust": ("trustworthy",),
    "vintage": ("retro", "heritage"),
    "classic": ("heritage", "timeless"),
    "edgy": ("bold", "brutal"),
    "dark": ("night", "moody"),
    # components
    "modal": ("dialog",),
    "popup": ("popover", "dialog"),
    "dropdown": ("menu", "select"),
    "slider": ("carousel", "range"),
    "collapsible": ("accordion", "disclosure"),
    "tooltip": ("hint",),
    "toast": ("notification",),
    "testimonial": ("quote", "review"),
    # story / structure
    "founder": ("origin", "letter", "personal"),
    "history": ("heritage", "timeline", "archive"),
    "construction": ("build", "building", "assemble"),
    "building": ("build", "construction", "assemble"),
    "architecture": ("build", "construction", "place"),
    "journey": ("route", "path", "timeline"),
    "supply": ("route", "sourcing", "origin"),
    "team": ("people", "crew"),
    "renovation": ("before", "transformation", "restore"),
    "values": ("manifesto", "belief", "principle"),
    "mission": ("manifesto", "belief"),
    "portfolio": ("work", "project", "index"),
}
