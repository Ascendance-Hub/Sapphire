import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

const docs = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!superpowers/**'], base: '../docs' }),
})

export const collections = { docs }
