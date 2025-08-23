import { BragDocHero } from '@/components/bragdoc/BragDocHero';
import { BragDocBenefits } from '@/components/bragdoc/BragDocBenefits';
import { BragDocCallToAction } from '@/components/bragdoc/BragDocCallToAction';
import { BragDocTestimonials } from '@/components/bragdoc/BragDocTestimonials';
import { BragDocComparison } from '@/components/bragdoc/BragDocComparison';
import { BragDocFaqs } from '@/components/bragdoc/BragDocFaqs';
import { BragDocSecondaryCTA } from '@/components/bragdoc/BragDocSecondaryCTA';

export default function WhatPage() {
  return (
    <>
      <BragDocHero />
      <BragDocBenefits />
      {/* <BragDocExamples /> */}
      <BragDocCallToAction />
      <BragDocTestimonials />
      <BragDocComparison />
      <BragDocFaqs />
      <BragDocSecondaryCTA />
    </>
  );
}
