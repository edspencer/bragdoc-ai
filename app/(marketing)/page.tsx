import { Hero } from '@/components/marketing/salient/Hero'
import { PrimaryFeatures } from '@/components/marketing/salient/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/marketing/salient/SecondaryFeatures'
import { CallToAction } from '@/components/marketing/salient/CallToAction'
import { Testimonials } from '@/components/marketing/salient/Testimonials'
import { Pricing } from '@/components/marketing/salient/Pricing'
import { Faqs } from '@/components/marketing/salient/Faqs'

export default function HomePage() {
  return (
    <>
      <Hero />
      <PrimaryFeatures />
      <SecondaryFeatures />
      <CallToAction />
      <Testimonials />
      <Pricing />
      <Faqs />
    </>
  )
}
