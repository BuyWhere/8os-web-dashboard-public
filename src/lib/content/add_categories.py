import re

# Read the file
with open('blog.ts', 'r') as f:
    content = f.read()

# Define category mappings based on slug and keywords
category_map = {
    # BaZi category
    'what-is-bazi-best-self': 'BaZi',
    'star-sign-half-story-goals': 'BaZi',
    'science-of-timing-goals': 'BaZi',
    'why-no-birth-time': 'BaZi',
    'agency-over-fate': 'BaZi',
    'bazi-productivity': 'BaZi',
    'five-elements-leadership': 'BaZi',
    'five-elements-communication': 'BaZi',
    'metal-element-guide': 'BaZi',
    'water-element-guide': 'BaZi',
    'wood-element-guide': 'BaZi',
    'fire-element-guide': 'BaZi',
    'earth-element-guide': 'BaZi',
    'bazi-timing-decisions': 'BaZi',
    'bazi-for-founders': 'BaZi',
    'bazi-team-dynamics': 'BaZi',
    'bazi-leadership-styles': 'BaZi',
    'bazi-financial-mindset': 'BaZi',
    'bazi-for-students': 'BaZi',
    'bazi-exercise-fitness': 'BaZi',
    'bazi-creativity': 'BaZi',
    'bazi-parenting': 'BaZi',
    'bazi-conflict-resolution': 'BaZi',
    'bazi-remote-work': 'BaZi',
    'bazi-mental-health': 'Mental Health',
    
    # Productivity category
    'goal-setting-personality': 'Productivity',
    'productivity-archetypes': 'Productivity',
    'morning-routine-by-archetype': 'Productivity',
    'best-time-to-start-goals': 'Productivity',
    'deep-work-by-element': 'Productivity',
    'burnout-by-element': 'Mental Health',
    'weekly-planning-by-archetype': 'Productivity',
    'habit-formation-by-element': 'Productivity',
    'goal-setting-seasonal-rhythm': 'Productivity',
    'decision-making-by-element': 'Productivity',
    'bazi-sleep-recovery': 'Mental Health',
    
    # Archetypes category
    'archetype-capricorn-geng-metal': 'Archetypes',
    'famous-archetypes': 'Archetypes',
    'how-to-use-your-archetype': 'Archetypes',
    'archetype-career-change': 'Archetypes',
    'archetype-networking': 'Archetypes',
    'archetype-reading-list': 'Archetypes',
    
    # Comparisons category
    'todoist-vs-notion': 'Comparisons',
    'what-is-personal-operating-system': 'BaZi',
    'myers-briggs-vs-bazi': 'Comparisons',
    'bazi-vs-enneagram': 'Comparisons',
    'bazi-vs-human-design': 'Comparisons',
    'bazi-vs-disc': 'Comparisons',
    'productivity-apps-by-element': 'Comparisons',
    'relationship-goals-by-element': 'Productivity',
}

# Add category to each post
for slug, category in category_map.items():
    # Find the post and add category after keywords
    pattern = rf"(slug: '{slug}',\s*title:.*?keywords: \[.*?\],)"
    replacement = rf"\1\n    category: '{category}',"
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write the file back
with open('blog.ts', 'w') as f:
    f.write(content)

print("Categories added successfully!")
