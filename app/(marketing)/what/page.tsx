import { BragDocHero } from '@/components/marketing/bragdoc/BragDocHero';
import { BragDocBenefits } from '@/components/marketing/bragdoc/BragDocBenefits';
import { BragDocExamples } from '@/components/marketing/bragdoc/BragDocExamples';
import { BragDocCallToAction } from '@/components/marketing/bragdoc/BragDocCallToAction';
import { BragDocTestimonials } from '@/components/marketing/bragdoc/BragDocTestimonials';
import { BragDocComparison } from '@/components/marketing/bragdoc/BragDocComparison';
import { BragDocFaqs } from '@/components/marketing/bragdoc/BragDocFaqs';
import { BragDocSecondaryCTA } from '@/components/marketing/bragdoc/BragDocSecondaryCTA';

export default function WhatPage() {
  return (
    <>
      <BragDocHero />
      <BragDocBenefits />
      <BragDocExamples />
      <BragDocCallToAction />
      <BragDocTestimonials />
      <BragDocComparison />
      <BragDocFaqs />
      <BragDocSecondaryCTA />
    </>
  );
}
