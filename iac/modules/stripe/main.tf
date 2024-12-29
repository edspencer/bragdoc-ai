###############################################################################
# MAIN CONFIG
###############################################################################
terraform {
  required_providers {
    stripe = {
      source  = "andrewbaxter/stripe"
      version = "0.0.24"
    }
  }
}

provider "stripe" {
  # Typically, you'd rely on STRIPE_API_KEY in your environment.
  # If you absolutely must, you can set `api_key = "sk_test_123"` here.
  token = var.stripe_api_key
}

###############################################################################
# STRIPE PRODUCTS
###############################################################################
resource "stripe_product" "bragger_basic" {
  name        = "Basic Bragger"
  tax_code    = "txcd_10000000"
  description = "Unlimited access to Bragger Basic features."
}

resource "stripe_product" "bragger_pro" {
  name        = "Pro Bragger"
  tax_code    = "txcd_10000000"
  description = "Unlimited access to bragdoc.ai Pro features."
}

###############################################################################
# STRIPE PRICES
###############################################################################
resource "stripe_price" "basic_monthly" {
  product                  = stripe_product.bragger_basic.id
  currency                 = "usd"
  unit_amount              = 500
  lookup_key               = "basic_monthly"
  billing_scheme           = "per_unit"
  tax_behavior             = "unspecified"
  recurring_interval       = "month"
  recurring_interval_count = 1
  recurring_usage_type     = "licensed"

  lifecycle {
    ignore_changes = [unit_amount_decimal]
  }
}

resource "stripe_price" "basic_yearly" {
  product                  = stripe_product.bragger_basic.id
  currency                 = "usd"
  unit_amount              = 3000
  lookup_key               = "basic_yearly"
  billing_scheme           = "per_unit"
  tax_behavior             = "unspecified"
  recurring_interval       = "year"
  recurring_interval_count = 1
  recurring_usage_type     = "licensed"

  lifecycle {
    ignore_changes = [unit_amount_decimal]
  }
}

resource "stripe_price" "pro_monthly" {
  product                  = stripe_product.bragger_pro.id
  currency                 = "usd"
  unit_amount              = 900
  lookup_key               = "pro_monthly"
  billing_scheme           = "per_unit"
  tax_behavior             = "unspecified"
  recurring_interval       = "month"
  recurring_interval_count = 1
  recurring_usage_type     = "licensed"

  lifecycle {
    ignore_changes = [unit_amount_decimal]
  }
}

resource "stripe_price" "pro_yearly" {
  product                  = stripe_product.bragger_pro.id
  currency                 = "usd"
  unit_amount              = 9000
  lookup_key               = "pro_yearly"
  billing_scheme           = "per_unit"
  tax_behavior             = "unspecified"
  recurring_interval       = "year"
  recurring_interval_count = 1
  recurring_usage_type     = "licensed"

  lifecycle {
    ignore_changes = [unit_amount_decimal]
  }
}

###############################################################################
# STRIPE PAYMENT LINKS
###############################################################################
resource "stripe_payment_link" "basic_monthly" {
  line_items {
    price    = stripe_price.basic_monthly.id
    quantity = 1
  }
  tax_id_collection_enabled     = true
  after_completion_type         = "redirect"
  after_completion_redirect_url = "${var.base_url}/chat"
  currency                      = "usd"
  submit_type                   = "auto"
  payment_method_collection     = "always"
  customer_creation             = "if_required"
  billing_address_collection    = "auto"
}

resource "stripe_payment_link" "basic_yearly" {
  line_items {
    price    = stripe_price.basic_yearly.id
    quantity = 1
  }
  tax_id_collection_enabled     = true
  after_completion_type         = "redirect"
  after_completion_redirect_url = "${var.base_url}/chat"
  currency                      = "usd"
  submit_type                   = "auto"
  payment_method_collection     = "always"
  customer_creation             = "if_required"
  billing_address_collection    = "auto"
}

resource "stripe_payment_link" "pro_monthly" {
  line_items {
    price    = stripe_price.pro_monthly.id
    quantity = 1
  }
  tax_id_collection_enabled     = true
  after_completion_type         = "redirect"
  after_completion_redirect_url = "${var.base_url}/chat"
  currency                      = "usd"
  submit_type                   = "auto"
  payment_method_collection     = "always"
  customer_creation             = "if_required"
  billing_address_collection    = "auto"
}

resource "stripe_payment_link" "pro_yearly" {
  line_items {
    price    = stripe_price.pro_yearly.id
    quantity = 1
  }
  tax_id_collection_enabled     = true
  after_completion_type         = "redirect"
  after_completion_redirect_url = "${var.base_url}/chat"
  currency                      = "usd"
  submit_type                   = "auto"
  payment_method_collection     = "always"
  customer_creation             = "if_required"
  billing_address_collection    = "auto"
}

# resource "stripe_billing_portal_configuration" "default" {
#   business_profile_headline             = "Bragdoc.ai YEA"
#   default_return_url                    = "${var.base_url}/chat"
#   business_profile_privacy_policy_url   = "${var.base_url}/privacy"
#   business_profile_terms_of_service_url = "${var.base_url}/terms"

#   features_subscription_update_enabled = false
#   features_subscription_cancel_enabled = true
#   features_customer_update_enabled     = true
# }

###############################################################################
# WEBHOOK
###############################################################################

resource "stripe_webhook_endpoint" "default" {
  enabled_events = [
    "checkout.session.completed",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "customer.subscription.deleted",
  ]
  url = "${var.base_url}/api/stripe/callback"
}

###############################################################################
# OUTPUTS
###############################################################################
output "basic_monthly_payment_link_url" {
  description = "Payment Link for Basic Monthly"
  value       = stripe_payment_link.basic_monthly.url
}

output "basic_yearly_payment_link_url" {
  description = "Payment Link for Basic Yearly"
  value       = stripe_payment_link.basic_yearly.url
}

output "pro_monthly_payment_link_url" {
  description = "Payment Link for Pro Monthly"
  value       = stripe_payment_link.pro_monthly.url
}

output "pro_yearly_payment_link_url" {
  description = "Payment Link for Pro Yearly"
  value       = stripe_payment_link.pro_yearly.url
}
