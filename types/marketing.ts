export interface Feature {
  title: string
  description: string
  icon?: string
  link?: string
}

export interface PricingTier {
  name: string
  price: {
    monthly: number
    yearly: number
  }
  description: string
  features: string[]
  highlighted?: boolean
}

export interface Testimonial {
  quote: string
  author: {
    name: string
    title: string
    company: string
  }
  image?: string
}

export interface FAQItem {
  question: string
  answer: string
  category?: string
}
