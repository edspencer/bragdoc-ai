variable "base_url" {
  type        = string
  description = "Base URL for the application"
  default     = "https://www.bragdoc.ai"
}

variable "stripe_api_key" {
  type        = string
  description = "API key for Stripe API"
  sensitive   = true
}
