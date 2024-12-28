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
  redirect_url   = var.redirect_url
  stripe_api_key = var.stripe_api_key
}

variable "redirect_url" {
  type    = string
  default = "https://ngrok.edspencer.net/chat"
}

variable "stripe_api_key" {
  type        = string
  description = "API key for Stripe API"
  sensitive   = true
}
