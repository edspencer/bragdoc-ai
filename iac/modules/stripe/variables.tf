variable "redirect_url" {
  type        = string
  description = "URL to redirect after successful payment"
  default     = "https://example.com/chat"
}

variable "stripe_api_key" {
  type        = string
  description = "API key for Stripe API"
  sensitive   = true
}
