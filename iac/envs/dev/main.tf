# terraform/envs/staging/main.tf
terraform {
  required_providers {
    stripe = {
      source  = "andrewbaxter/stripe"
      version = "0.0.24"
    }
  }
}

module "stripe" {
  source         = "../../modules/stripe"
  base_url       = var.base_url
  stripe_api_key = var.stripe_api_key
}

variable "base_url" {
  type    = string
  default = "https://ngrok.edspencer.net/chat"
}

variable "stripe_api_key" {
  type        = string
  description = "API key for Stripe API"
  sensitive   = true
}

output "basic_monthly_price_id" {
  value = module.stripe.basic_monthly_payment_link_url
}
output "basic_yearly_price_id" {
  value = module.stripe.basic_yearly_payment_link_url
}
output "pro_monthly_price_id" {
  value = module.stripe.pro_monthly_payment_link_url
}
output "pro_yearly_price_id" {
  value = module.stripe.pro_yearly_payment_link_url
}

output "webhook_secret" {
  description = "Webhook Secret"
  value       = module.stripe.webhook_secret
}
