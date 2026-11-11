# Official PayPal REST specification excerpts

Source: paypal/paypal-rest-api-specifications; commit 90e8041ffe02d80c452d2b476bedd59a8d219bdc. Licensed Apache-2.0. Full license accompanies the study. The operation blocks below are verbatim JSON values from the official OpenAPI sources. Referenced schemas follow in breadth-first reference order. The frozen token budget may end the final schema excerpt.


## POST /v2/checkout/orders
Source: checkout_orders_v2.json

{
  "operationId": "orders.create",
  "summary": "Create order",
  "description": "Creates an order. Merchants and partners can add Level 2 and 3 data to payments to reduce risk and payment processing costs. For more information about processing payments, see <a href=\"https://developer.paypal.com/docs/checkout/advanced/processing/\">checkout</a> or <a href=\"https://developer.paypal.com/docs/multiparty/checkout/advanced/processing/\">multiparty checkout</a>.<blockquote><strong>Note:</strong> For error handling and troubleshooting, see <a href=\"https://developer.paypal.com/api/rest/reference/orders/v2/errors/#create-order\">Orders v2 errors</a>.</blockquote>",
  "tags": [
    "orders"
  ],
  "security": [
    {
      "Oauth2": [
        "https://uri.paypal.com/services/payments/payment",
        "https://uri.paypal.com/services/payments/orders/deprecating-jssdk-migration-for-limited-merchants"
      ]
    }
  ],
  "parameters": [
    {
      "name": "PayPal-Request-Id",
      "description": "The server stores keys for 6 hours. The API callers can request the times to up to 72 hours by speaking to their Account Manager. It is mandatory for all single-step create order calls (E.g. Create Order Request with payment source information like Card, PayPal.vault_id, PayPal.billing_agreement_id, etc).",
      "in": "header",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 108,
        "pattern": "^[\\S\\s]*$"
      },
      "examples": {
        "orders_create_authorize_single_step_paypal_with_vault_id_and_stored_credentials_usage_pattern": {
          "summary": "Create and authorize an order for a PayPal wallet vaulted account holder passing a usage pattern indicator using stored credentials (Single Shot).",
          "description": "Creates an order and authorizes payment with a PayPal wallet vault id as the payment source and a usage pattern (billing indicator) RECURRING_PREPAID passed using stored credentials.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        },
        "00_orders_create": {
          "summary": "Create Order - PayPal Wallet as Payment Source, Resulting in PAYER_ACTION_REQUIRED Response",
          "description": "Creates a new order. API caller receives payer-action link.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        }
      }
    },
    {
      "name": "PayPal-Partner-Attribution-Id",
      "description": "PayPal Partner can send a PayPal-Partner-Attribution-Id request header with the value that they have been assigned by the PayPal Partner program. This value is known as a BN Code. In order to reward such partners (through partner programs), all the activities (including API calls) that they are doing on behalf of the merchants need to be tracked.",
      "in": "header",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 36,
        "pattern": "^[\\S\\s]*$"
      }
    },
    {
      "$ref": "#/components/parameters/paypal_client_metadata_id"
    },
    {
      "name": "Prefer",
      "description": "The preferred server response upon successful completion of the request. Value is:<ul><li><code>return=minimal</code>. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the <code>id</code>, <code>status</code> and HATEOAS links.</li><li><code>return=representation</code>. The server returns a complete resource representation, including the current state of the resource.</li></ul>",
      "in": "header",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 25,
        "pattern": "^[a-zA-Z=,-]*$",
        "default": "return=minimal"
      },
      "examples": {
        "orders_create_create_orders_with_shipping_type_pickup_in_store": {
          "summary": "Create Order - Buy Online Pickup In Store Shipping Type",
          "description": "Creates an order with minimal parameters and contains the Buy Online Pickup in Store-related fields.",
          "value": "return=representation"
        }
      }
    },
    {
      "$ref": "#/components/parameters/authorization"
    },
    {
      "$ref": "#/components/parameters/paypal_auth_assertion"
    }
  ],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/order_request"
        },
        "examples": {
          "00_orders_create": {
            "summary": "Create Order - PayPal Wallet as Payment Source, Resulting in PAYER_ACTION_REQUIRED Response",
            "description": "Creates a new order. API caller receives payer-action link.",
            "value": {
              "payment_source": {
                "paypal": {
                  "experience_context": {
                    "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
                    "landing_page": "LOGIN",
                    "shipping_preference": "GET_FROM_FILE",
                    "user_action": "PAY_NOW",
                    "return_url": "https://example.com/returnUrl",
                    "cancel_url": "https://example.com/cancelUrl"
                  }
                }
              },
              "purchase_units": [
                {
                  "invoice_id": "90210",
                  "amount": {
                    "currency_code": "USD",
                    "value": "230.00",
                    "breakdown": {
                      "item_total": {
                        "currency_code": "USD",
                        "value": "220.00"
                      },
                      "shipping": {
                        "currency_code": "USD",
                        "value": "10.00"
                      }
                    }
                  },
                  "items": [
                    {
                      "name": "T-Shirt",
                      "description": "Super Fresh Shirt",
                      "unit_amount": {
                        "currency_code": "USD",
                        "value": "20.00"
                      },
                      "quantity": "1",
                      "category": "PHYSICAL_GOODS",
                      "sku": "sku01",
                      "image_url": "https://example.com/static/images/items/1/tshirt_green.jpg",
                      "url": "https://example.com/url-to-the-item-being-purchased-1",
                      "upc": {
                        "type": "UPC-A",
                        "code": "123456789012"
                      }
                    },
                    {
                      "name": "Shoes",
                      "description": "Running, Size 10.5",
                      "sku": "sku02",
                      "unit_amount": {
                        "currency_code": "USD",
                        "value": "100.00"
                      },
                      "quantity": "2",
                      "category": "PHYSICAL_GOODS",
                      "image_url": "https://example.com/static/images/items/1/shoes_running.jpg",
                      "url": "https://example.com/url-to-the-item-being-purchased-2",
                      "upc": {
                        "type": "UPC-A",
                        "code": "987654321012"
                      }
                    }
                  ]
                }
              ]
            }
          },
          "create_422_unprocessable_entity_missing_pickup_address": {
            "summary": "Create Order - 422 Unprocessable Entity Error - Missing Pickup Address",
            "description": "This code sample attempts to create an order but the shipping address is required and `shipping.type` is set to PICKUP_FROM_PERSON ",
            "value": {
              "payment_source": {
                "paypal": {
                  "experience_context": {
                    "return_url": "https://www.example.com/returnURL",
                    "cancel_url": "https://www.example.com/cancelURL",
                    "shipping_preference": "SET_PROVIDED_ADDRESS"
                  }
                }
              },
              "purchase_units": [
                {
                  "reference_id": "PUHF",
                  "amount": {
                    "currency_code": "USD",
                    "value": "100.00"
                  },
                  "shipping": {
                    "type": "PICKUP_FROM_PERSON"
                  }
                }
              ]
            }
          },
          "orders_create_authorize_single_step_paypal_with_vault_id_and_stored_credentials_usage_pattern": {
            "summary": "Create and authorize an order for a PayPal wallet vaulted account holder passing a usage pattern indicator using stored credentials (Single Shot).",
            "description": "Creates an order and authorizes payment with a PayPal wallet vault id as the payment source and a usage pattern (billing indicator) RECURRING_PREPAID passed using stored credentials.",
            "value": {
              "purchase_units": [
                {
                  "amount": {
                    "currency_code": "USD",
                    "value": "100.00"
                  }
                }
              ],
              "payment_source": {
                "paypal": {
                  "vault_id": "2w915838hr181240m"
                }
              }
            }
          },
          "orders_create_create_orders_with_shipping_type_pickup_in_store": {
            "summary": "Create Order - Buy Online Pickup In Store Shipping Type",
            "description": "Creates an order with minimal parameters and contains the Buy Online Pickup in Store-related fields.",
            "value": {
              "purchase_units": [
                {
                  "reference_id": "PUHF",
                  "amount": {
                    "currency_code": "USD",
                    "value": "50.00"
                  },
                  "payee": {
                    "email_address": "merchant@example.com"
                  },
                  "shipping": {
                    "address": {
                      "address_line_1": "123 Townsend St",
                      "address_line_2": "Floor 6",
                      "admin_area_2": "San Francisco",
                      "admin_area_1": "CA",
                      "postal_code": "94107",
                      "country_code": "US"
                    },
                    "type": "PICKUP_IN_STORE"
                  }
                }
              ]
            }
          },
          "orders_create_simple": {
            "summary": "Create Order - Minimal Request and Response",
            "description": "Creates an order with only required parameters. By default, uses the minimal representation.",
            "value": {
              "purchase_units": [
                {
                  "amount": {
                    "currency_code": "USD",
                    "value": "100.00"
                  }
                }
              ]
            }
          }
        }
      }
    }
  },
  "responses": {
    "200": {
      "description": "A successful response to an idempotent request returns the HTTP `200 OK` status code with a JSON response body that shows order details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          },
          "examples": {
            "00_orders_create": {
              "summary": "Create Order - PayPal Wallet as Payment Source, Resulting in PAYER_ACTION_REQUIRED Response",
              "description": "Creates a new order. API caller receives payer-action link.",
              "value": {
                "id": "5O190127TN364715T",
                "payment_source": {
                  "paypal": {}
                },
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://www.paypal.com/checkoutnow?token=5O190127TN364715T",
                    "rel": "payer-action",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "201": {
      "description": "A successful request returns the HTTP `201 Created` status code and a JSON response body that includes by default a minimal response with the ID, status, and HATEOAS links. If you require the complete order resource representation, you must pass the <a href=\"https://developer.paypal.com/docs/api/orders/v2/#orders-create-header-parameters\"><code>Prefer: return=representation</code> request header</a>. This header value is not the default.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          },
          "examples": {
            "orders_create_authorize_single_step_paypal_with_vault_id_and_stored_credentials_usage_pattern": {
              "summary": "Create and authorize an order for a PayPal wallet vaulted account holder passing a usage pattern indicator using stored credentials (Single Shot).",
              "description": "Creates an order and authorizes payment with a PayPal wallet vault id as the payment source and a usage pattern (billing indicator) RECURRING_PREPAID passed using stored credentials.",
              "value": {
                "id": "8K832279M55989614",
                "payment_source": {
                  "paypal": {
                    "email_address": "buyer@paypal.com",
                    "account_id": "XQHSN372NGSP2",
                    "account_status": "UNVERIFIED",
                    "name": {
                      "given_name": "Tom",
                      "surname": "Business"
                    },
                    "phone_number": {
                      "national_number": "8127081430"
                    },
                    "address": {
                      "country_code": "US"
                    }
                  }
                },
                "purchase_units": [
                  {
                    "reference_id": "default",
                    "amount": {
                      "currency_code": "USD",
                      "value": "100.00"
                    },
                    "payee": {
                      "email_address": "seller@paypal.com",
                      "merchant_id": "Q7C9N6S4YRQXG"
                    },
                    "shipping": {
                      "name": {
                        "full_name": "Tom Business"
                      },
                      "address": {
                        "address_line_1": "123 Fake St.",
                        "admin_area_2": "Baton Rouge",
                        "admin_area_1": "LA",
                        "postal_code": "70802",
                        "country_code": "US"
                      }
                    },
                    "payments": {
                      "authorizations": [
                        {
                          "status": "CREATED",
                          "id": "7X550106NA4440028",
                          "amount": {
                            "currency_code": "USD",
                            "value": "100.00"
                          },
                          "seller_protection": {
                            "status": "ELIGIBLE",
                            "dispute_categories": [
                              "UNAUTHORIZED_TRANSACTION"
                            ]
                          },
                          "expiration_time": "2024-06-05T18:46:54Z",
                          "links": [
                            {
                              "href": "https://api-m.paypal.com/v2/payments/authorizations/7X550106NA4440028",
                              "rel": "self",
                              "method": "GET"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/payments/authorizations/7X550106NA4440028/capture",
                              "rel": "capture",
                              "method": "POST"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/payments/authorizations/7X550106NA4440028/void",
                              "rel": "void",
                              "method": "POST"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/checkout/orders/8K832279M55989614",
                              "rel": "up",
                              "method": "GET"
                            }
                          ],
                          "create_time": "2024-05-07T18:46:54Z",
                          "update_time": "2024-05-07T18:46:54Z"
                        }
                      ]
                    }
                  }
                ],
                "payer": {
                  "name": {
                    "given_name": "Tom",
                    "surname": "Business"
                  },
                  "email_address": "buyer@paypal.com",
                  "payer_id": "XQHSN372NGSP2",
                  "phone": {
                    "phone_number": {
                      "national_number": "8127081430"
                    }
                  },
                  "address": {
                    "country_code": "US"
                  }
                },
                "create_time": "2024-05-07T18:46:15Z",
                "update_time": "2024-05-07T18:46:54Z",
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/8K832279M55989614",
                    "rel": "self",
                    "method": "GET"
                  }
                ]
              }
            },
            "orders_create_create_orders_with_shipping_type_pickup_in_store": {
              "summary": "Create Order - Buy Online Pickup In Store Shipping Type",
              "description": "Creates an order with minimal parameters and contains the Buy Online Pickup in Store-related fields.",
              "value": {
                "id": "4SP74185RW2405200",
                "purchase_units": [
                  {
                    "reference_id": "PUHF",
                    "amount": {
                      "currency_code": "USD",
                      "value": "50.00"
                    },
                    "payee": {
                      "email_address": "merchant@example.com"
                    },
                    "shipping": {
                      "address": {
                        "address_line_1": "123 Townsend St",
                        "address_line_2": "Floor 6",
                        "admin_area_2": "San Francisco",
                        "admin_area_1": "CA",
                        "postal_code": "94107",
                        "country_code": "US"
                      },
                      "type": "PICKUP_IN_STORE"
                    }
                  }
                ],
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/4SP74185RW2405200",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://www.paypal.com/checkoutnow?token=4SP74185RW2405200",
                    "rel": "approve",
                    "method": "GET"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/4SP74185RW2405200",
                    "rel": "edit",
                    "method": "PATCH"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/4SP74185RW2405200/authorize",
                    "rel": "authorize",
                    "method": "POST"
                  }
                ]
              }
            },
            "orders_create_simple": {
              "summary": "Create Order - Minimal Request and Response",
              "description": "Creates an order with only required parameters. By default, uses the minimal representation.",
              "value": {
                "id": "5O190127TN364715T",
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://www.paypal.com/checkoutnow?token=5O190127TN364715T",
                    "rel": "approve",
                    "method": "GET"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "edit",
                    "method": "PATCH"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T/capture",
                    "rel": "capture",
                    "method": "POST"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "202": {
      "description": "The request has been accepted for processing, but the processing has not been completed yet. The server returns the HTTP `202 Accepted` status code to indicate that the request is valid and will be handled asynchronously.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          }
        }
      }
    },
    "400": {
      "description": "Request is not well-formed, syntactically incorrect, or violates schema.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          },
          "examples": {
            "create_400_bad_request": {
              "summary": "Create Order - 400 Bad Request Error - Purchase Unit is Empty",
              "description": "This code sample attempts to create an order with empty purchase units. The request fails.",
              "value": {
                "name": "INVALID_REQUEST",
                "message": "Request is not well-formed, syntactically incorrect, or violates schema.",
                "debug_id": "10398537340c8",
                "details": [
                  {
                    "field": "/purchase_units",
                    "value": "[]",
                    "location": "body",
                    "issue": "INVALID_ARRAY_MIN_ITEMS",
                    "description": "The number of items in an array parameter is too small."
                  }
                ],
                "links": [
                  {
                    "href": "https://developer.paypal.com/api/orders/v2/#error-INVALID_ARRAY_MIN_ITEMS",
                    "rel": "information_link"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "401": {
      "$ref": "#/components/responses/401_error_response"
    },
    "403": {
      "$ref": "#/components/responses/403_error_response"
    },
    "422": {
      "description": "The requested action could not be performed, semantically incorrect, or failed business validation.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          },
          "examples": {
            "create_422_unprocessable_entity_missing_pickup_address": {
              "summary": "Create Order - 422 Unprocessable Entity Error - Missing Pickup Address",
              "description": "This code sample attempts to create an order but the shipping address is required and `shipping.type` is set to PICKUP_FROM_PERSON ",
              "value": {
                "name": "UNPROCESSABLE_ENTITY",
                "details": [
                  {
                    "field": "/purchase_units/@reference_id=='PUHF'/shipping/address",
                    "issue": "MISSING_SHIPPING_ADDRESS",
                    "description": "The shipping address is required when `shipping_preference=SET_PROVIDED_ADDRESS`."
                  }
                ],
                "message": "The requested action could not be performed, semantically incorrect, or failed business validation.",
                "debug_id": "f200264a4e02a",
                "links": [
                  {
                    "href": "https://developer.paypal.com/api/rest/reference/orders/v2/errors/#MISSING_SHIPPING_ADDRESS",
                    "rel": "information_link",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "500": {
      "$ref": "#/components/responses/500_error_response"
    },
    "default": {
      "$ref": "#/components/responses/default_response"
    }
  },
  "x-exampleFlows": [
    {
      "title": "Create Order - PayPal Wallet as Payment Source, Resulting in PAYER_ACTION_REQUIRED Response",
      "description": "Creates a new order. API caller receives payer-action link.",
      "parameter_examples": [
        "parameters/@name=='PayPal-Request-Id'/examples/00_orders_create",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/00_orders_create",
      "response_example": "responses/200/content/application~1json/examples/00_orders_create"
    },
    {
      "title": "Create and authorize an order for a PayPal wallet vaulted account holder passing a usage pattern indicator using stored credentials (Single Shot).",
      "description": "Creates an order and authorizes payment with a PayPal wallet vault id as the payment source and a usage pattern (billing indicator) RECURRING_PREPAID passed using stored credentials.",
      "parameter_examples": [
        "parameters/@name=='PayPal-Request-Id'/examples/orders_create_authorize_single_step_paypal_with_vault_id_and_stored_credentials_usage_pattern",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/orders_create_authorize_single_step_paypal_with_vault_id_and_stored_credentials_usage_pattern",
      "response_example": "responses/201/content/application~1json/examples/orders_create_authorize_single_step_paypal_with_vault_id_and_stored_credentials_usage_pattern"
    },
    {
      "title": "Create Order - Minimal Request and Response",
      "description": "Creates an order with only required parameters. By default, uses the minimal representation.",
      "parameter_examples": [
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/orders_create_simple",
      "response_example": "responses/201/content/application~1json/examples/orders_create_simple"
    },
    {
      "title": "Create Order - Buy Online Pickup In Store Shipping Type",
      "description": "Creates an order with minimal parameters and contains the Buy Online Pickup in Store-related fields.",
      "parameter_examples": [
        "parameters/@name=='Authorization'/examples/bearer",
        "parameters/@name=='Prefer'/examples/orders_create_create_orders_with_shipping_type_pickup_in_store"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/orders_create_create_orders_with_shipping_type_pickup_in_store",
      "response_example": "responses/201/content/application~1json/examples/orders_create_create_orders_with_shipping_type_pickup_in_store"
    },
    {
      "title": "Create Order - 400 Bad Request Error - Purchase Unit is Empty",
      "description": "This code sample attempts to create an order with empty purchase units. The request fails.",
      "parameter_examples": [
        "parameters/@name=='Authorization'/examples/bearer",
        "parameters/@name=='Prefer'/examples/orders_create_create_order_mixed_cart_with_shipping_options_bwp_unknown_status"
      ],
      "response_example": "responses/400/content/application~1json/examples/create_400_bad_request"
    },
    {
      "title": "Create Order - 422 Unprocessable Entity Error - Missing Pickup Address",
      "description": "This code sample attempts to create an order but the shipping address is required and `shipping.type` is set to PICKUP_FROM_PERSON ",
      "parameter_examples": [
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/create_422_unprocessable_entity_missing_pickup_address",
      "response_example": "responses/422/content/application~1json/examples/create_422_unprocessable_entity_missing_pickup_address"
    }
  ]
}


## GET /v2/checkout/orders/{id}
Source: checkout_orders_v2.json

{
  "operationId": "orders.get",
  "summary": "Show order details",
  "description": "Shows details for an order, by ID.<blockquote><strong>Note:</strong> For error handling and troubleshooting, see <a href=\"https://developer.paypal.com/api/rest/reference/orders/v2/errors/#get-order\">Orders v2 errors</a>.</blockquote>",
  "tags": [
    "orders"
  ],
  "security": [
    {
      "Oauth2": [
        "https://uri.paypal.com/services/payments/payment",
        "https://uri.paypal.com/services/payments/orders/deprecating-jssdk-migration-for-limited-merchants"
      ]
    }
  ],
  "parameters": [
    {
      "name": "id",
      "description": "The ID of the order for which to show details.",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 36,
        "pattern": "^[A-Z0-9]+$"
      },
      "examples": {
        "00_orders_get": {
          "summary": "Get Order - Show Order Details After Customer Approval",
          "description": "Shows order details immediately after customer approval.",
          "value": "5O190127TN364715T"
        }
      }
    },
    {
      "$ref": "#/components/parameters/authorization"
    },
    {
      "$ref": "#/components/parameters/paypal_auth_assertion"
    },
    {
      "name": "fields",
      "description": "A comma-separated list of fields that should be returned for the order. Valid filter field is `payment_source`.",
      "in": "query",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 0,
        "maxLength": 2147483647,
        "pattern": "^[a-z_]*$"
      }
    }
  ],
  "responses": {
    "200": {
      "description": "A successful request returns the HTTP `200 OK` status code and a JSON response body that shows order details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          },
          "examples": {
            "00_orders_get": {
              "summary": "Get Order - Show Order Details After Customer Approval",
              "description": "Shows order details immediately after customer approval.",
              "value": {
                "id": "5O190127TN364715T",
                "payment_source": {
                  "paypal": {
                    "name": {
                      "given_name": "John",
                      "surname": "Doe"
                    },
                    "email_address": "customer@example.com",
                    "account_id": "QYR5Z8XDVJNXQ"
                  }
                },
                "purchase_units": [
                  {
                    "reference_id": "d9f80740-38f0-11e8-b467-0ed5f89f718b",
                    "amount": {
                      "currency_code": "USD",
                      "value": "100.00"
                    }
                  }
                ],
                "payer": {
                  "name": {
                    "given_name": "John",
                    "surname": "Doe"
                  },
                  "email_address": "customer@example.com",
                  "payer_id": "QYR5Z8XDVJNXQ"
                },
                "create_time": "2018-04-01T21:18:49Z",
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://www.paypal.com/checkoutnow?token=5O190127TN364715T",
                    "rel": "approve",
                    "method": "GET"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "edit",
                    "method": "PATCH"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T/capture",
                    "rel": "capture",
                    "method": "POST"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "401": {
      "$ref": "#/components/responses/401_error_response"
    },
    "403": {
      "$ref": "#/components/responses/403_error_response"
    },
    "404": {
      "$ref": "#/components/responses/404_error_response"
    },
    "500": {
      "$ref": "#/components/responses/500_error_response"
    },
    "default": {
      "$ref": "#/components/responses/default_response"
    }
  },
  "x-exampleFlows": [
    {
      "title": "Get Order - Show Order Details After Customer Approval",
      "description": "Shows order details immediately after customer approval.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/00_orders_get",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "response_example": "responses/200/content/application~1json/examples/00_orders_get"
    },
    {
      "title": "Get Order - 404 Not Found Error - Order Not Found",
      "description": "This code sample attempts to show details for an order, by ID, but the request fails because the order is not found.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/00_orders_get"
      ],
      "response_example": "responses/404/content/application~1json/examples/generic"
    }
  ]
}


## POST /v2/checkout/orders/{id}/capture
Source: checkout_orders_v2.json

{
  "operationId": "orders.capture",
  "summary": "Capture payment for order",
  "description": "Captures payment for an order. To successfully capture payment for an order, the buyer must first approve the order or a valid payment_source must be provided in the request. A buyer can approve the order upon being redirected to the rel:approve URL that was returned in the HATEOAS links in the create order response.<blockquote><strong>Note:</strong> For error handling and troubleshooting, see <a href=\"https://developer.paypal.com/api/rest/reference/orders/v2/errors/#capture-order\">Orders v2 errors</a>.</blockquote>",
  "tags": [
    "orders"
  ],
  "security": [
    {
      "Oauth2": [
        "https://uri.paypal.com/services/payments/payment",
        "https://uri.paypal.com/services/payments/orders/deprecating-jssdk-migration-for-limited-merchants"
      ]
    }
  ],
  "parameters": [
    {
      "name": "PayPal-Request-Id",
      "description": "The server stores keys for 6 hours. The API callers can request the times to up to 72 hours by speaking to their Account Manager. It is mandatory for all single-step create order calls (E.g. Create Order Request with payment source information like Card, PayPal.vault_id, PayPal.billing_agreement_id, etc).",
      "in": "header",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 108,
        "pattern": "^[\\S\\s]*$"
      },
      "examples": {
        "orders_capture_wallet_idempotent": {
          "summary": "Capture Order - Idempotent Response with PayPal Wallet",
          "description": "Captures payment for an order after wallet approval with the same idempotency key. By default, uses the minimal representation.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        },
        "capture_422_unprocessable_entity": {
          "summary": "Capture Order - 422 Unprocessable Entity Error - Action Does Not Match Intent",
          "description": "This code sample attempts to capture payment for an order that was created with `intent=AUTHORIZE`. The operation is incorrect.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        },
        "00_orders_capture": {
          "summary": "Capture Order - PayPal Wallet as Payment Source",
          "description": "Captures payment for an order after wallet approval. By default, uses the minimal representation.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        },
        "capture_422_payer_action_required_cib_psd2_sca_ba_in_sc": {
          "summary": "Capture Order - 422 - Payer Action Required",
          "description": "This code sample attempts to capture payment for an order that was created by the api caller and the payment could not be processed due to PSD2 SCA compliance requirement.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        },
        "orders_capture_vault_wallet": {
          "summary": "Capture Order - Minimal Representation with PayPal Wallet Vault ID",
          "description": "The partner captures payment for an order after PayPal Wallet approval. By default, uses the minimal representation.",
          "value": "7b92603e-77ed-4896-8e78-5dea2050476a"
        }
      }
    },
    {
      "name": "Prefer",
      "description": "The preferred server response upon successful completion of the request. Value is:<ul><li><code>return=minimal</code>. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the <code>id</code>, <code>status</code> and HATEOAS links.</li><li><code>return=representation</code>. The server returns a complete resource representation, including the current state of the resource.</li></ul>",
      "in": "header",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 25,
        "pattern": "^[a-zA-Z=,-]*$",
        "default": "return=minimal"
      }
    },
    {
      "$ref": "#/components/parameters/paypal_client_metadata_id"
    },
    {
      "name": "id",
      "description": "The ID of the order for which to capture a payment.",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 1,
        "maxLength": 36,
        "pattern": "^[A-Z0-9]+$"
      },
      "examples": {
        "00_orders_capture": {
          "summary": "Capture Order - PayPal Wallet as Payment Source",
          "description": "Captures payment for an order after wallet approval. By default, uses the minimal representation.",
          "value": "5O190127TN364715T"
        },
        "capture_422_payer_action_required_cib_psd2_sca_ba_in_sc": {
          "summary": "Capture Order - 422 - Payer Action Required",
          "description": "This code sample attempts to capture payment for an order that was created by the api caller and the payment could not be processed due to PSD2 SCA compliance requirement.",
          "value": "5O190127TN364715T"
        },
        "capture_422_unprocessable_entity": {
          "summary": "Capture Order - 422 Unprocessable Entity Error - Action Does Not Match Intent",
          "description": "This code sample attempts to capture payment for an order that was created with `intent=AUTHORIZE`. The operation is incorrect.",
          "value": "5O190127TN364715T"
        },
        "orders_capture_vault_wallet": {
          "summary": "Capture Order - Minimal Representation with PayPal Wallet Vault ID",
          "description": "The partner captures payment for an order after PayPal Wallet approval. By default, uses the minimal representation.",
          "value": "5O190127TN364715T"
        },
        "orders_capture_wallet_idempotent": {
          "summary": "Capture Order - Idempotent Response with PayPal Wallet",
          "description": "Captures payment for an order after wallet approval with the same idempotency key. By default, uses the minimal representation.",
          "value": "5O190127TN364715T"
        }
      }
    },
    {
      "$ref": "#/components/parameters/authorization"
    },
    {
      "$ref": "#/components/parameters/paypal_auth_assertion"
    }
  ],
  "requestBody": {
    "required": false,
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/order_capture_request"
        },
        "examples": {
          "00_orders_capture": {
            "summary": "Capture Order - PayPal Wallet as Payment Source",
            "description": "Captures payment for an order after wallet approval. By default, uses the minimal representation.",
            "value": {}
          },
          "capture_422_payer_action_required_cib_psd2_sca_ba_in_sc": {
            "summary": "Capture Order - 422 - Payer Action Required",
            "description": "This code sample attempts to capture payment for an order that was created by the api caller and the payment could not be processed due to PSD2 SCA compliance requirement.",
            "value": {}
          },
          "capture_422_unprocessable_entity": {
            "summary": "Capture Order - 422 Unprocessable Entity Error - Action Does Not Match Intent",
            "description": "This code sample attempts to capture payment for an order that was created with `intent=AUTHORIZE`. The operation is incorrect.",
            "value": {}
          },
          "orders_capture_vault_wallet": {
            "summary": "Capture Order - Minimal Representation with PayPal Wallet Vault ID",
            "description": "The partner captures payment for an order after PayPal Wallet approval. By default, uses the minimal representation.",
            "value": {}
          },
          "orders_capture_wallet_idempotent": {
            "summary": "Capture Order - Idempotent Response with PayPal Wallet",
            "description": "Captures payment for an order after wallet approval with the same idempotency key. By default, uses the minimal representation.",
            "value": {}
          }
        }
      }
    }
  },
  "responses": {
    "200": {
      "description": "A successful response to an idempotent request returns the HTTP `200 OK` status code with a JSON response body that shows captured payment details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          },
          "examples": {
            "orders_capture_wallet_idempotent": {
              "summary": "Capture Order - Idempotent Response with PayPal Wallet",
              "description": "Captures payment for an order after wallet approval with the same idempotency key. By default, uses the minimal representation.",
              "value": {
                "id": "5O190127TN364715T",
                "payment_source": {
                  "paypal": {
                    "name": {
                      "given_name": "John",
                      "surname": "Doe"
                    },
                    "email_address": "customer@example.com",
                    "account_id": "QYR5Z8XDVJNXQ",
                    "account_status": "VERIFIED"
                  }
                },
                "purchase_units": [
                  {
                    "reference_id": "d9f80740-38f0-11e8-b467-0ed5f89f718b",
                    "shipping": {
                      "address": {
                        "address_line_1": "2211 N First Street",
                        "address_line_2": "Building 17",
                        "admin_area_2": "San Jose",
                        "admin_area_1": "CA",
                        "postal_code": "95131",
                        "country_code": "US"
                      }
                    },
                    "payments": {
                      "captures": [
                        {
                          "id": "3C679366HH908993F",
                          "status": "COMPLETED",
                          "amount": {
                            "currency_code": "USD",
                            "value": "100.00"
                          },
                          "seller_protection": {
                            "status": "ELIGIBLE",
                            "dispute_categories": [
                              "ITEM_NOT_RECEIVED",
                              "UNAUTHORIZED_TRANSACTION"
                            ]
                          },
                          "final_capture": true,
                          "seller_receivable_breakdown": {
                            "gross_amount": {
                              "currency_code": "USD",
                              "value": "100.00"
                            },
                            "paypal_fee": {
                              "currency_code": "USD",
                              "value": "3.00"
                            },
                            "net_amount": {
                              "currency_code": "USD",
                              "value": "97.00"
                            }
                          },
                          "create_time": "2018-04-01T21:20:49Z",
                          "update_time": "2018-04-01T21:20:49Z",
                          "links": [
                            {
                              "href": "https://api-m.paypal.com/v2/payments/captures/3C679366HH908993F",
                              "rel": "self",
                              "method": "GET"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/payments/captures/3C679366HH908993F/refund",
                              "rel": "refund",
                              "method": "POST"
                            }
                          ]
                        }
                      ]
                    }
                  }
                ],
                "payer": {
                  "name": {
                    "given_name": "John",
                    "surname": "Doe"
                  },
                  "email_address": "customer@example.com",
                  "payer_id": "QYR5Z8XDVJNXQ"
                },
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "self",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "201": {
      "description": "A successful response to a non-idempotent request returns the HTTP `201 Created` status code with a JSON response body that shows captured payment details. If a duplicate response is retried, returns the HTTP `200 OK` status code. By default, the response is minimal. If you need the complete resource representation, pass the <a href=\"https://developer.paypal.com/docs/api/orders/v2/#orders-authorize-header-parameters\"><code>Prefer: return=representation</code> request header</a>.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          },
          "examples": {
            "00_orders_capture": {
              "summary": "Capture Order - PayPal Wallet as Payment Source",
              "description": "Captures payment for an order after wallet approval. By default, uses the minimal representation.",
              "value": {
                "id": "5O190127TN364715T",
                "payment_source": {
                  "paypal": {
                    "name": {
                      "given_name": "John",
                      "surname": "Doe"
                    },
                    "email_address": "customer@example.com",
                    "account_id": "QYR5Z8XDVJNXQ"
                  }
                },
                "purchase_units": [
                  {
                    "reference_id": "d9f80740-38f0-11e8-b467-0ed5f89f718b",
                    "shipping": {
                      "address": {
                        "address_line_1": "2211 N First Street",
                        "address_line_2": "Building 17",
                        "admin_area_2": "San Jose",
                        "admin_area_1": "CA",
                        "postal_code": "95131",
                        "country_code": "US"
                      }
                    },
                    "payments": {
                      "captures": [
                        {
                          "id": "3C679366HH908993F",
                          "status": "COMPLETED",
                          "amount": {
                            "currency_code": "USD",
                            "value": "100.00"
                          },
                          "seller_protection": {
                            "status": "ELIGIBLE",
                            "dispute_categories": [
                              "ITEM_NOT_RECEIVED",
                              "UNAUTHORIZED_TRANSACTION"
                            ]
                          },
                          "final_capture": true,
                          "seller_receivable_breakdown": {
                            "gross_amount": {
                              "currency_code": "USD",
                              "value": "100.00"
                            },
                            "paypal_fee": {
                              "currency_code": "USD",
                              "value": "3.00"
                            },
                            "net_amount": {
                              "currency_code": "USD",
                              "value": "97.00"
                            }
                          },
                          "create_time": "2018-04-01T21:20:49Z",
                          "update_time": "2018-04-01T21:20:49Z",
                          "links": [
                            {
                              "href": "https://api-m.paypal.com/v2/payments/captures/3C679366HH908993F",
                              "rel": "self",
                              "method": "GET"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/payments/captures/3C679366HH908993F/refund",
                              "rel": "refund",
                              "method": "POST"
                            }
                          ]
                        }
                      ]
                    }
                  }
                ],
                "payer": {
                  "name": {
                    "given_name": "John",
                    "surname": "Doe"
                  },
                  "email_address": "customer@example.com",
                  "payer_id": "QYR5Z8XDVJNXQ"
                },
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "self",
                    "method": "GET"
                  }
                ]
              }
            },
            "orders_capture_vault_wallet": {
              "summary": "Capture Order - Minimal Representation with PayPal Wallet Vault ID",
              "description": "The partner captures payment for an order after PayPal Wallet approval. By default, uses the minimal representation.",
              "value": {
                "id": "5O190127TN364715T",
                "payment_source": {
                  "paypal": {
                    "attributes": {
                      "vault": {
                        "id": "m6yd4yw",
                        "status": "CREATED"
                      }
                    }
                  }
                },
                "purchase_units": [
                  {
                    "reference_id": "refernece_id_1001",
                    "shipping": {
                      "name": {
                        "full_name": "William Chris"
                      },
                      "address": {
                        "address_line_1": "500 Hillside Street",
                        "address_line_2": "#100",
                        "admin_area_2": "San Jose",
                        "admin_area_1": "CA",
                        "postal_code": "95131",
                        "country_code": "US"
                      }
                    },
                    "payments": {
                      "captures": [
                        {
                          "id": "54986457XR262021N",
                          "status": "COMPLETED",
                          "amount": {
                            "currency_code": "USD",
                            "value": "31.01"
                          },
                          "final_capture": true,
                          "seller_protection": {
                            "status": "ELIGIBLE",
                            "dispute_categories": [
                              "ITEM_NOT_RECEIVED",
                              "UNAUTHORIZED_TRANSACTION"
                            ]
                          },
                          "seller_receivable_breakdown": {
                            "gross_amount": {
                              "currency_code": "USD",
                              "value": "31.01"
                            },
                            "platform_fees": [
                              {
                                "amount": {
                                  "currency_code": "USD",
                                  "value": "10.01"
                                },
                                "payee": {
                                  "merchant_id": "J8NCBBULP5JH2"
                                }
                              }
                            ],
                            "net_amount": {
                              "currency_code": "USD",
                              "value": "21.00"
                            }
                          },
                          "invoice_id": "invoice_id_380358551C5240203",
                          "custom_id": "custom_id_1001",
                          "links": [
                            {
                              "href": "https://api-m.paypal.com/v2/payments/captures/54986457XR262021N",
                              "rel": "self",
                              "method": "GET"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/payments/captures/54986457XR262021N/refund",
                              "rel": "refund",
                              "method": "POST"
                            },
                            {
                              "href": "https://api-m.paypal.com/v2/checkout/orders/12645781RH9888226",
                              "rel": "up",
                              "method": "GET"
                            }
                          ],
                          "create_time": "2020-06-08T23:11:34Z",
                          "update_time": "2020-06-08T23:11:34Z"
                        }
                      ]
                    }
                  }
                ],
                "links": [
                  {
                    "href": "https://api-m.paypal.com/v2/checkout/orders/5O190127TN364715T",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://api-m.paypal.com/v2/vault/payment-tokens/m6yd4yw",
                    "rel": "payment-token",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "202": {
      "description": "The request has been accepted for processing, but the processing has not been completed yet. The server returns the HTTP `202 Accepted` status code to indicate that the request is valid and will be handled asynchronously.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          }
        }
      }
    },
    "207": {
      "description": "The request was successfully processed, but the result contains mixed outcomes. When an order includes multiple purchase units, the server returns the HTTP `207 Multi-Status` code to indicate that one or more purchase units were processed successfully while others failed. The response body provides the processing result for each purchase unit.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/order"
          }
        }
      }
    },
    "400": {
      "description": "Request is not well-formed, syntactically incorrect, or violates schema.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          }
        }
      }
    },
    "401": {
      "$ref": "#/components/responses/401_error_response"
    },
    "403": {
      "$ref": "#/components/responses/403_error_response"
    },
    "404": {
      "$ref": "#/components/responses/404_error_response"
    },
    "409": {
      "description": "The request could not be completed due to a conflict with the current state of the resource. The HTTP `409 Conflict` status code is returned when the requested operation is not allowed because the order or one or more purchase units are in a state that prevents the operation.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          }
        }
      }
    },
    "422": {
      "description": "The requested action could not be performed, semantically incorrect, or failed business validation.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          },
          "examples": {
            "capture_422_payer_action_required_cib_psd2_sca_ba_in_sc": {
              "summary": "Capture Order - 422 - Payer Action Required",
              "description": "This code sample attempts to capture payment for an order that was created by the api caller and the payment could not be processed due to PSD2 SCA compliance requirement.",
              "value": {
                "name": "UNPROCESSABLE_ENTITY",
                "details": [
                  {
                    "issue": "PAYER_ACTION_REQUIRED",
                    "description": "Transaction cannot complete successfully, instruct the buyer to return to PayPal."
                  }
                ],
                "message": "The requested action could not be performed, semantically incorrect, or failed business validation.",
                "debug_id": "f63fbc340a6ce",
                "links": [
                  {
                    "href": "https://developer.paypal.com/api/orders/v2/#error-PAYER_ACTION_REQUIRED",
                    "rel": "information_link",
                    "method": "GET"
                  },
                  {
                    "href": "https://www.paypal.com/checkoutnow?token=5O190127TN364715T",
                    "rel": "payer-action",
                    "method": "GET"
                  }
                ]
              }
            },
            "capture_422_unprocessable_entity": {
              "summary": "Capture Order - 422 Unprocessable Entity Error - Action Does Not Match Intent",
              "description": "This code sample attempts to capture payment for an order that was created with `intent=AUTHORIZE`. The operation is incorrect.",
              "value": {
                "name": "UNPROCESSABLE_ENTITY",
                "details": [
                  {
                    "location": "body",
                    "issue": "ACTION_DOES_NOT_MATCH_INTENT",
                    "description": "The order was created with an intent of `AUTHORIZE`. To complete authorization, use `/v2/checkout/orders/{order_id}/authorize`. Or, alternately create an order with an intent of `CAPTURE`."
                  }
                ],
                "message": "The requested action could not be performed, semantically incorrect, or failed business validation.",
                "debug_id": "90957fca61718",
                "links": [
                  {
                    "href": "https://developer.paypal.com/api/orders/v2/#error-ACTION_DOES_NOT_MATCH_INTENT",
                    "rel": "information_link",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "500": {
      "$ref": "#/components/responses/500_error_response"
    },
    "default": {
      "$ref": "#/components/responses/default_response"
    }
  },
  "x-exampleFlows": [
    {
      "title": "Capture Order - PayPal Wallet as Payment Source",
      "description": "Captures payment for an order after wallet approval. By default, uses the minimal representation.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/00_orders_capture",
        "parameters/@name=='PayPal-Request-Id'/examples/00_orders_capture",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "response_example": "responses/201/content/application~1json/examples/00_orders_capture"
    },
    {
      "title": "Capture Order - Idempotent Response with PayPal Wallet",
      "description": "Captures payment for an order after wallet approval with the same idempotency key. By default, uses the minimal representation.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/orders_capture_wallet_idempotent",
        "parameters/@name=='PayPal-Request-Id'/examples/orders_capture_wallet_idempotent",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "response_example": "responses/200/content/application~1json/examples/orders_capture_wallet_idempotent"
    },
    {
      "title": "Capture Order - Minimal Representation with PayPal Wallet Vault ID",
      "description": "The partner captures payment for an order after PayPal Wallet approval. By default, uses the minimal representation.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/orders_capture_vault_wallet",
        "parameters/@name=='PayPal-Request-Id'/examples/orders_capture_vault_wallet",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "response_example": "responses/201/content/application~1json/examples/orders_capture_vault_wallet"
    },
    {
      "title": "Capture Order - 403 Forbidden Error - Invalid Card Vault ID",
      "description": "This code sample attempts to capture an order that was created with the `CAPTURE` intent but the card vault id can not be found. The request fails.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted",
        "parameters/@name=='PayPal-Request-Id'/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted",
        "parameters/@name=='Authorization'/examples/bearer",
        "parameters/@name=='Prefer'/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted",
      "response_example": "responses/403/content/application~1json/examples/generic"
    },
    {
      "title": "Capture Order - 404 Not Found Error - Resource Not Found",
      "description": "This code sample attempts to capture an order but the specified order is not found. The request fails.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted",
        "parameters/@name=='PayPal-Request-Id'/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted",
        "parameters/@name=='Authorization'/examples/bearer",
        "parameters/@name=='Prefer'/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/orders_capture_orders_capture_bank_ach_debit_verified_account_customer_id_vault_instruction_vaulted",
      "response_example": "responses/404/content/application~1json/examples/generic"
    },
    {
      "title": "Capture Order - 422 - Payer Action Required",
      "description": "This code sample attempts to capture payment for an order that was created by the api caller and the payment could not be processed due to PSD2 SCA compliance requirement.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/capture_422_payer_action_required_cib_psd2_sca_ba_in_sc",
        "parameters/@name=='PayPal-Request-Id'/examples/capture_422_payer_action_required_cib_psd2_sca_ba_in_sc",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "request_body_example": "requestBody/content/application~1json/examples/capture_422_payer_action_required_cib_psd2_sca_ba_in_sc",
      "response_example": "responses/422/content/application~1json/examples/capture_422_payer_action_required_cib_psd2_sca_ba_in_sc"
    },
    {
      "title": "Capture Order - 422 Unprocessable Entity Error - Action Does Not Match Intent",
      "description": "This code sample attempts to capture payment for an order that was created with `intent=AUTHORIZE`. The operation is incorrect.",
      "parameter_examples": [
        "parameters/@name=='id'/examples/capture_422_unprocessable_entity",
        "parameters/@name=='PayPal-Request-Id'/examples/capture_422_unprocessable_entity",
        "parameters/@name=='Authorization'/examples/bearer"
      ],
      "response_example": "responses/422/content/application~1json/examples/capture_422_unprocessable_entity"
    }
  ]
}


## checkout_orders_v2.json securitySchemes/Oauth2
{
  "type": "oauth2",
  "description": "Oauth 2.0 authentication",
  "flows": {
    "clientCredentials": {
      "tokenUrl": "https://api-m.paypal.com/v1/oauth2/token",
      "scopes": {
        "https://uri.paypal.com/services/payments/payment": "Manage payments and checkout workflow.",
        "https://uri.paypal.com/services/payments/payment/reference-transaction": "Permission to initiate reference transaction",
        "https://uri.paypal.com/services/payments/initiatepayment": "Initiates payments and checkout workflows.",
        "https://uri.paypal.com/services/payments/orders/deprecating-jssdk-migration-for-limited-merchants": "Allows client-side integration on Create, Get, Patch, Authorize & Capture Order endpoints.",
        "https://uri.paypal.com/services/payments/orders/client_sdk_orders_api": "Enables secure client-side integration on confirm payment source endpoint",
        "https://uri.paypal.com/services/payments/orders/provision-card": "Manage card provisioning merchants."
      }
    }
  }
}


## GET /v2/payments/captures/{capture_id}
Source: payments_payment_v2.json

{
  "operationId": "captures.get",
  "summary": "Show captured payment details",
  "description": "Shows details for a captured payment, by ID.",
  "tags": [
    "captures"
  ],
  "security": [
    {
      "Oauth2": [
        "https://uri.paypal.com/services/payments/payment/authcapture"
      ]
    }
  ],
  "parameters": [
    {
      "name": "capture_id",
      "description": "The PayPal-generated ID for the captured payment for which to show details.",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 0,
        "maxLength": 2147483647,
        "pattern": "^[\\S\\s]*$"
      },
      "examples": {
        "capture_get_with_paypal_fee_receivable_currency": {
          "summary": "Show Captured Payment Details",
          "description": "Shows details for a captured payment, by ID.",
          "value": "74L756601X447022Y"
        }
      }
    },
    {
      "$ref": "#/components/parameters/authorization"
    }
  ],
  "x-exampleFlows": [
    {
      "title": "Show captured payment details with paypal fee in receivable currency",
      "description": "Retrieves complete details for a captured payment by ID with PayPal fee breakdown.",
      "parameter_examples": [
        "parameters/@name=='capture_id'/examples/capture_get_with_paypal_fee_receivable_currency"
      ],
      "response_example": "responses/200/content/application~1json/examples/capture_get_with_paypal_fee_receivable_currency"
    }
  ],
  "responses": {
    "200": {
      "description": "A successful request returns the HTTP <code>200 OK</code> status code and a JSON response body that shows captured payment details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/capture-2"
          },
          "examples": {
            "capture_get_with_paypal_fee_receivable_currency": {
              "summary": "Show Captured Payment Details",
              "description": "Shows details for a captured payment, by ID.",
              "value": {
                "id": "74L756601X447022Y",
                "amount": {
                  "currency_code": "USD",
                  "value": "100.00"
                },
                "final_capture": true,
                "seller_protection": {
                  "status": "ELIGIBLE",
                  "dispute_categories": [
                    "ITEM_NOT_RECEIVED",
                    "UNAUTHORIZED_TRANSACTION"
                  ]
                },
                "seller_receivable_breakdown": {
                  "gross_amount": {
                    "currency_code": "USD",
                    "value": "100.00"
                  },
                  "paypal_fee": {
                    "currency_code": "USD",
                    "value": "3.98"
                  },
                  "net_amount": {
                    "currency_code": "USD",
                    "value": "96.02"
                  }
                },
                "invoice_id": "OrderInvoice-23_10_2024_12_27_32_pm",
                "status": "COMPLETED",
                "supplementary_data": {
                  "related_ids": {
                    "order_id": "25M43554V9523650M",
                    "authorization_id": "0T620041CK889853A"
                  }
                },
                "payee": {
                  "email_address": "merchant@example.com",
                  "merchant_id": "YXZY75W2GKDQE"
                },
                "create_time": "2024-10-23T20:55:19Z",
                "update_time": "2024-10-23T20:55:19Z",
                "links": [
                  {
                    "href": "https://api-m.sandbox.paypal.com/v2/payments/captures/74L756601X447022Y",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://api-m.sandbox.paypal.com/v2/payments/captures/74L756601X447022Y/refund",
                    "rel": "refund",
                    "method": "POST"
                  },
                  {
                    "href": "https://api-m.sandbox.paypal.com/v2/payments/authorizations/0T620041CK889853A",
                    "rel": "up",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "401": {
      "$ref": "#/components/responses/401_error_response"
    },
    "403": {
      "$ref": "#/components/responses/403_error_response"
    },
    "404": {
      "$ref": "#/components/responses/404_error_response"
    },
    "500": {
      "$ref": "#/components/responses/500_error_response"
    },
    "default": {
      "$ref": "#/components/responses/default_response"
    }
  }
}


## POST /v2/payments/captures/{capture_id}/refund
Source: payments_payment_v2.json

{
  "operationId": "captures.refund",
  "summary": "Refund captured payment",
  "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the JSON request body. For a partial refund, include an <code>amount</code> object in the JSON request body.",
  "tags": [
    "captures"
  ],
  "security": [
    {
      "Oauth2": [
        "https://uri.paypal.com/services/payments/refund"
      ]
    }
  ],
  "parameters": [
    {
      "name": "capture_id",
      "description": "The PayPal-generated ID for the captured payment to refund.",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 0,
        "maxLength": 2147483647,
        "pattern": "^[\\S\\s]*$"
      },
      "examples": {
        "captures_refund_200_idempotent_response": {
          "summary": "Refund Captured Payment - 200 idempotent response",
          "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
          "value": "2GG279541U471931P"
        },
        "captures_refund_empty_request": {
          "summary": "Refund Captured Payment with an empty request",
          "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
          "value": "7TK53561YB803214S"
        },
        "captures_refund_with_prefer_header": {
          "summary": "Refund Captured Payment",
          "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
          "value": "2GG279541U471931P"
        }
      }
    },
    {
      "$ref": "#/components/parameters/paypal_request_id"
    },
    {
      "name": "Prefer",
      "description": "The preferred server response upon successful completion of the request. Value is:<ul><li><code>return=minimal</code>. The server returns a minimal response to optimize communication between the API caller and the server. A minimal response includes the <code>id</code>, <code>status</code> and HATEOAS links.</li><li><code>return=representation</code>. The server returns a complete resource representation, including the current state of the resource.</li></ul>",
      "in": "header",
      "required": false,
      "schema": {
        "type": "string",
        "minLength": 0,
        "maxLength": 2147483647,
        "pattern": "^[\\S\\s]*$",
        "default": "return=minimal"
      },
      "examples": {
        "captures_refund_200_idempotent_response": {
          "summary": "Refund Captured Payment - 200 idempotent response",
          "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
          "value": "return=representation"
        },
        "captures_refund_with_prefer_header": {
          "summary": "Refund Captured Payment",
          "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
          "value": "return=representation"
        },
        "captures_refund_empty_request": {
          "summary": "Refund Captured Payment with an empty request",
          "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
          "value": "return=representation"
        }
      }
    },
    {
      "$ref": "#/components/parameters/authorization"
    },
    {
      "$ref": "#/components/parameters/paypal_auth_assertion"
    }
  ],
  "requestBody": {
    "required": false,
    "content": {
      "application/json": {
        "schema": {
          "$ref": "#/components/schemas/refund_request"
        },
        "examples": {
          "captures_refund_200_idempotent_response": {
            "summary": "Refund Captured Payment - 200 idempotent response",
            "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
            "value": {
              "amount": {
                "value": "1.00",
                "currency_code": "USD"
              },
              "invoice_id": "RefundInvoice-123",
              "custom_id": "RefundCustom-123"
            }
          },
          "captures_refund_empty_request": {
            "summary": "Refund Captured Payment with an empty request",
            "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
            "value": {}
          },
          "captures_refund_with_prefer_header": {
            "summary": "Refund Captured Payment",
            "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
            "value": {
              "amount": {
                "value": "10.99",
                "currency_code": "USD"
              },
              "invoice_id": "INVOICE-123",
              "note": "Defective product"
            }
          }
        }
      }
    }
  },
  "x-exampleFlows": [
    {
      "title": "Partial refund of a captured payment",
      "description": "Refunds a portion of a captured payment by ID. Includes an amount object in the request body specifying the partial refund amount.",
      "parameter_examples": [
        "parameters/@name=='capture_id'/examples/captures_refund"
      ],
      "request_example": "requestBody/content/application~1json/examples/captures_refund",
      "response_example": "responses/201/content/application~1json/examples/captures_refund"
    },
    {
      "title": "Full refund with empty request body",
      "description": "Refunds the full amount of a captured payment by ID. Includes an empty payload in the request body.",
      "parameter_examples": [
        "parameters/@name=='capture_id'/examples/captures_refund_empty_request",
        "parameters/@name=='Prefer'/examples/captures_refund_empty_request"
      ],
      "request_example": "requestBody/content/application~1json/examples/captures_refund_empty_request",
      "response_example": "responses/201/content/application~1json/examples/captures_refund_empty_request"
    },
    {
      "title": "Refund with Prefer header for full representation",
      "description": "Refunds a captured payment by ID with the Prefer header set to return=representation to get the complete refund details in the response.",
      "parameter_examples": [
        "parameters/@name=='capture_id'/examples/captures_refund_with_prefer_header",
        "parameters/@name=='Prefer'/examples/captures_refund_with_prefer_header"
      ],
      "request_example": "requestBody/content/application~1json/examples/captures_refund_with_prefer_header",
      "response_example": "responses/201/content/application~1json/examples/captures_refund_with_prefer_header"
    },
    {
      "title": "Idempotent refund request (200 response)",
      "description": "Demonstrates an idempotent refund request where the same PayPal-Request-Id is used, resulting in a 200 OK response with the existing refund details.",
      "parameter_examples": [
        "parameters/@name=='capture_id'/examples/captures_refund_200_idempotent_response",
        "parameters/@name=='Prefer'/examples/captures_refund_200_idempotent_response"
      ],
      "request_example": "requestBody/content/application~1json/examples/captures_refund_200_idempotent_response",
      "response_example": "responses/200/content/application~1json/examples/captures_refund_200_idempotent_response"
    }
  ],
  "responses": {
    "200": {
      "description": "A successful request returns the HTTP <code>200 OK</code> status code and a JSON response body that shows refund details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/refund"
          },
          "examples": {
            "captures_refund_200_idempotent_response": {
              "summary": "Refund Captured Payment - 200 idempotent response",
              "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
              "value": {
                "id": "0K35355239430361V",
                "amount": {
                  "currency_code": "USD",
                  "value": "1.00"
                },
                "seller_payable_breakdown": {
                  "gross_amount": {
                    "currency_code": "USD",
                    "value": "1.00"
                  },
                  "paypal_fee": {
                    "currency_code": "USD",
                    "value": "0.00"
                  },
                  "net_amount": {
                    "currency_code": "USD",
                    "value": "1.00"
                  },
                  "total_refunded_amount": {
                    "currency_code": "USD",
                    "value": "11.00"
                  }
                },
                "invoice_id": "RefundInvoice-14_10_2024_4_58_32_pm",
                "custom_id": "RefundCustom-14_10_2024_4_58_32_pm",
                "status": "COMPLETED",
                "create_time": "2024-10-14T14:58:34-07:00",
                "update_time": "2024-10-14T14:58:34-07:00",
                "links": [
                  {
                    "href": "https://api.paypal.com/v2/payments/refunds/0K35355239430361V",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://api.paypal.com/v2/payments/captures/7TK53561YB803214S",
                    "rel": "up",
                    "method": "GET"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "201": {
      "description": "A successful request returns the HTTP <code>201 Created</code> status code and a JSON response body that shows refund details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/refund"
          },
          "examples": {
            "captures_refund_empty_request": {
              "summary": "Refund Captured Payment with an empty request",
              "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
              "value": {
                "id": "58K15806CS993444T",
                "amount": {
                  "currency_code": "USD",
                  "value": "89.00"
                },
                "seller_payable_breakdown": {
                  "gross_amount": {
                    "currency_code": "USD",
                    "value": "89.00"
                  },
                  "paypal_fee": {
                    "currency_code": "USD",
                    "value": "0.00"
                  },
                  "net_amount": {
                    "currency_code": "USD",
                    "value": "89.00"
                  },
                  "total_refunded_amount": {
                    "currency_code": "USD",
                    "value": "100.00"
                  }
                },
                "invoice_id": "OrderInvoice-10_10_2024_12_58_20_pm",
                "status": "COMPLETED",
                "create_time": "2024-10-14T15:03:29-07:00",
                "update_time": "2024-10-14T15:03:29-07:00",
                "links": [
                  {
                    "href": "https://api.msmaster.qa.paypal.com/v2/payments/refunds/58K15806CS993444T",
                    "rel": "self",
                    "method": "GET"
                  },
                  {
                    "href": "https://api.msmaster.qa.paypal.com/v2/payments/captures/7TK53561YB803214S",
                    "rel": "up",
                    "method": "GET"
                  }
                ]
              }
            },
            "captures_refund_with_prefer_header": {
              "summary": "Refund Captured Payment",
              "description": "Refunds a captured payment, by ID. For a full refund, include an empty payload in the request body. For a partial refund, include an `amount` object.",
              "value": {
                "id": "1JU08902781691411",
                "amount": {
                  "value": "10.99",
                  "currency_code": "USD"
                },
                "status": "COMPLETED",
                "note": "Defective product",
                "seller_payable_breakdown": {
                  "gross_amount": {
                    "value": "10.99",
                    "currency_code": "USD"
                  },
                  "paypal_fee": {
                    "value": "0",
                    "currency_code": "USD"
                  },
                  "net_amount": {
                    "value": "10.99",
                    "currency_code": "USD"
                  },
                  "total_refunded_amount": {
                    "value": "10.99",
                    "currency_code": "USD"
                  }
                },
                "invoice_id": "INVOICE-123",
                "create_time": "2018-09-11T23:24:19Z",
                "update_time": "2018-09-11T23:24:19Z",
                "links": [
                  {
                    "rel": "self",
                    "method": "GET",
                    "href": "https://api-m.paypal.com/v2/payments/refunds/1JU08902781691411"
                  },
                  {
                    "rel": "up",
                    "method": "GET",
                    "href": "https://api-m.paypal.com/v2/payments/captures/2GG279541U471931P"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "400": {
      "description": "The request failed because it is not well-formed or is syntactically incorrect or violates schema.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          },
          "examples": {
            "capture_refund_400_invalid_request": {
              "summary": "Refund Captured Payment - 400 Bad Request - Validation Error",
              "description": "This code sample attempts to refund a captured payment, but the request fails because a validation error occurred.",
              "value": {
                "name": "INVALID_REQUEST",
                "message": "Request is not well-formed, syntactically incorrect, or violates schema",
                "debug_id": "78916e688cf7f",
                "details": [
                  {
                    "issue": "INVALID_STRING_LENGTH",
                    "field": "/invoice_id",
                    "value": "Fm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinqFm67fYiinq",
                    "description": "The value of a field is either too short or too long.",
                    "location": "body"
                  }
                ],
                "links": [
                  {
                    "href": "https://developer.paypal.com/docs/api/payments/v2/#error-INVALID_STRING_LENGTH",
                    "rel": "information_link"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "401": {
      "$ref": "#/components/responses/401_error_response"
    },
    "403": {
      "$ref": "#/components/responses/403_error_response"
    },
    "404": {
      "$ref": "#/components/responses/404_error_response"
    },
    "409": {
      "description": "The request failed because a previous call for the given resource is in progress.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          },
          "examples": {
            "captures_refund_409_conflict": {
              "summary": "Refund Captured Payment - 409 Conflict - Operation in Progress Error",
              "description": "This code sample attempts to refund a captured payment but the request fails because a previous call for the given resource is in progress.",
              "value": {
                "name": "RESOURCE_CONFLICT",
                "debug_id": "b1d1f06c7246c",
                "message": "The server has detected a conflict while processing this request.",
                "details": [
                  {
                    "issue": "PREVIOUS_REQUEST_IN_PROGRESS",
                    "description": "A previous request on this resource is currently in progress. Please wait for some time and try again. It is best to space out the initial and the subsequent request(s) to avoid receiving this error."
                  }
                ]
              }
            }
          }
        }
      }
    },
    "422": {
      "description": "The request failed because it either is semantically incorrect or failed business validation.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/error"
          },
          "examples": {
            "captures_refund_422_amount_exceeded": {
              "summary": "Refund Captured Payment - 422 Unprocessable Entity - Refund Amount Exceeded Error",
              "description": "This code sample attempts to refund a captured payment, but the request fails because the refund amount has exceeded the capture amount.",
              "value": {
                "name": "UNPROCCESSABLE_ENTITY",
                "message": "The requested action could not be completed, is semantically incorrect, or failed business validation.",
                "debug_id": "90bff07028f7f",
                "details": [
                  {
                    "issue": "REFUND_AMOUNT_EXCEEDED",
                    "description": "The refund amount must be less than or equal to the capture amount that has not yet been refunded."
                  }
                ]
              }
            },
            "captures_refund_422_transaction_disputed": {
              "summary": "Refund Captured Payment - 422 Unprocessable Entity - Capture Disputed Partial Refund Error",
              "description": "This code sample attempts to partially refund a captured payment, but the request fails because the captured payment is currently under dispute.",
              "value": {
                "name": "UNPROCESSABLE_ENTITY",
                "message": "The requested action could not be performed, semantically incorrect, or failed business validation.",
                "debug_id": "90bff07028f7f",
                "details": [
                  {
                    "issue": "TRANSACTION_DISPUTED",
                    "description": "Partial refunds cannot be offered at this time because there is an open case on this transaction. Visit the PayPal Resolution Center to review this case."
                  }
                ]
              }
            }
          }
        }
      }
    },
    "500": {
      "$ref": "#/components/responses/500_error_response"
    },
    "default": {
      "$ref": "#/components/responses/default_response"
    }
  },
  "callbacks": {
    "capture_refunded": {
      "$ref": "#/components/callbacks/capture_refunded"
    }
  }
}


## GET /v2/payments/refunds/{refund_id}
Source: payments_payment_v2.json

{
  "operationId": "refunds.get",
  "summary": "Show refund details",
  "description": "Shows details for a refund, by ID.",
  "tags": [
    "refunds"
  ],
  "security": [
    {
      "Oauth2": [
        "https://uri.paypal.com/services/payments/refund"
      ]
    }
  ],
  "parameters": [
    {
      "name": "refund_id",
      "description": "The PayPal-generated ID for the refund for which to show details.",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 0,
        "maxLength": 2147483647,
        "pattern": "^[\\S\\s]*$"
      },
      "examples": {
        "refunds_get_platform_fees": {
          "summary": "Show Refund Details with Platform Fees",
          "description": "Shows details for a refund, by ID, with platform fees.",
          "value": "1JU08902781691411"
        }
      }
    },
    {
      "$ref": "#/components/parameters/authorization"
    },
    {
      "$ref": "#/components/parameters/paypal_auth_assertion"
    }
  ],
  "x-exampleFlows": [
    {
      "title": "Show refund details with platform fees",
      "description": "Retrieves details for a refund by ID including platform fees information.",
      "parameter_examples": [
        "parameters/@name=='refund_id'/examples/refunds_get_platform_fees"
      ],
      "response_example": "responses/200/content/application~1json/examples/refunds_get_platform_fees"
    }
  ],
  "responses": {
    "200": {
      "description": "A successful request returns the HTTP <code>200 OK</code> status code and a JSON response body that shows refund details.",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/refund"
          },
          "examples": {
            "refunds_get_platform_fees": {
              "summary": "Show Refund Details with Platform Fees",
              "description": "Shows details for a refund, by ID, with platform fees.",
              "value": {
                "id": "1JU08902781691411",
                "amount": {
                  "value": "10.99",
                  "currency_code": "USD"
                },
                "status": "COMPLETED",
                "note": "Defective product",
                "seller_payable_breakdown": {
                  "gross_amount": {
                    "value": "10.99",
                    "currency_code": "USD"
                  },
                  "paypal_fee": {
                    "value": "0.33",
                    "currency_code": "USD"
                  },
                  "platform_fees": [
                    {
                      "amount": {
                        "currency_code": "USD",
                        "value": "1.00"
                      },
                      "payee": {
                        "email_address": "fee@example.com"
                      }
                    }
                  ],
                  "net_amount": {
                    "value": "9.66",
                    "currency_code": "USD"
                  },
                  "total_refunded_amount": {
                    "value": "10.99",
                    "currency_code": "USD"
                  }
                },
                "invoice_id": "INVOICE-123",
                "create_time": "2018-09-11T23:24:19Z",
                "update_time": "2018-09-11T23:24:19Z",
                "links": [
                  {
                    "rel": "self",
                    "method": "GET",
                    "href": "https://api-m.paypal.com/v2/payments/refunds/1JU08902781691411"
                  },
                  {
                    "rel": "up",
                    "method": "GET",
                    "href": "https://api-m.paypal.com/v2/payments/captures/2GG279541U471931P"
                  }
                ]
              }
            }
          }
        }
      }
    },
    "401": {
      "$ref": "#/components/responses/401_error_response"
    },
    "403": {
      "$ref": "#/components/responses/403_error_response"
    },
    "404": {
      "$ref": "#/components/responses/404_error_response"
    },
    "500": {
      "$ref": "#/components/responses/500_error_response"
    },
    "default": {
      "$ref": "#/components/responses/default_response"
    }
  }
}


## payments_payment_v2.json securitySchemes/Oauth2
{
  "type": "oauth2",
  "description": "OAuth 2.0 authentication",
  "flows": {
    "clientCredentials": {
      "tokenUrl": "https://api-m.paypal.com/v1/oauth2/token",
      "scopes": {
        "https://uri.paypal.com/services/payments/payment/authcapture": "Permission to do non-real time payments like capture on authorization",
        "https://uri.paypal.com/services/payments/refund": "Permission to initiate a refund on a capture transaction",
        "https://uri.paypal.com/services/payments/non-referenced-credit": "Permission to initiate non referenced credit",
        "https://uri.paypal.com/services/payments/realtimepayment": "Permission to do any real time payment, with support for sale/authorize/order intents",
        "https://uri.paypal.com/services/payments/reversepayment": "Permission to do any reverse payment",
        "https://uri.paypal.com/services/payments/payments-ready": "Permission to get information about payment readiness.",
        "Braintree:PaymentsReady": "Permission to call PaymentsReady via BrainTree SDK.",
        "https://uri.paypal.com/services/payments/client-payments-eligibility": "Permission to get information about merchant's eligible payment methods."
      }
    }
  }
}


## checkout_orders_v2.json #/components/parameters/paypal_client_metadata_id
{
  "name": "PayPal-Client-Metadata-Id",
  "in": "header",
  "description": "A GUID value originating from Fraudnet and Dyson passed from external API clients via HTTP header. The value is used by Risk decisions to correlate calls which, in turn, might result in lower decline rates..",
  "required": false,
  "schema": {
    "$ref": "#/components/schemas/guid"
  },
  "examples": {
    "guid": {
      "summary": "A GUID.",
      "description": "A paypal-client-metadata-id header with a randomized value.",
      "value": "1295065d-6f34-42dc-ac65-fac0c86af250"
    }
  }
}


## payments_payment_v2.json #/components/parameters/authorization
{
  "name": "Authorization",
  "in": "header",
  "description": "Holds authorization information for external API calls.",
  "required": false,
  "schema": {
    "$ref": "#/components/schemas/standard_header_schema"
  },
  "examples": {
    "bearer": {
      "summary": "Bearer authorization.",
      "description": "An authorization header with information for the Bearer authorization scheme. The authorization parameter value is randomized for this example.",
      "value": "Bearer A21AAGHr9qtiRRXH4oYcQokQgV99rGqEIfgrr8xHCclP0OzmD9KVgg5ppIIg1jzJgQkV4wd02svIvBJyg6cLFJjFow_SjBhxQ"
    }
  }
}


## checkout_orders_v2.json #/components/parameters/authorization
{
  "name": "Authorization",
  "in": "header",
  "description": "Holds authorization information for external API calls.",
  "required": false,
  "schema": {
    "$ref": "#/components/schemas/standard_header_schema"
  },
  "examples": {
    "bearer": {
      "summary": "Bearer authorization.",
      "description": "An authorization header with information for the Bearer authorization scheme. The authorization parameter value is randomized for this example.",
      "value": "Bearer A21AAGHr9qtiRRXH4oYcQokQgV99rGqEIfgrr8xHCclP0OzmD9KVgg5ppIIg1jzJgQkV4wd02svIvBJyg6cLFJjFow_SjBhxQ"
    }
  }
}


## payments_payment_v2.json #/components/schemas/capture-2
{
  "title": "Captured Payment",
  "description": "A captured payment.",
  "type": "object",
  "allOf": [
    {
      "$ref": "#/components/schemas/capture"
    },
    {
      "type": "object",
      "properties": {
        "supplementary_data": {
          "allOf": [
            {
              "$ref": "#/components/schemas/supplementary_data"
            },
            {
              "description": "An object that provides supplementary/additional data related to a payment transaction.",
              "readOnly": true
            }
          ]
        },
        "payee": {
          "allOf": [
            {
              "$ref": "#/components/schemas/payee_base"
            },
            {
              "readOnly": true
            }
          ]
        }
      }
    }
  ]
}


## checkout_orders_v2.json #/components/parameters/paypal_auth_assertion
{
  "name": "PayPal-Auth-Assertion",
  "in": "header",
  "description": "Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.",
  "required": false,
  "schema": {
    "description": "Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.",
    "type": "string",
    "minLength": 1,
    "maxLength": 10000,
    "pattern": "^.*$"
  },
  "examples": {
    "auth_assertion": {
      "summary": "An auth assertion.",
      "description": "A paypal-auth-assertion header with a randomized value.",
      "value": "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6Im15QGVtYWlsLmNvbSJ9"
    }
  }
}


## payments_payment_v2.json #/components/responses/401_error_response
{
  "description": "Unauthorized.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic 'Unauthorized' error.",
          "description": "Example response for unauthorized request.",
          "value": {
            "name": "AUTHENTICATION_FAILURE",
            "debug_id": "b1d1f06c7246c",
            "message": "Authentication failed due to missing Authorization header, or invalid authentication credentials."
          }
        }
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/order_request
{
  "title": "Order Request",
  "description": "The order request details.",
  "type": "object",
  "required": [
    "intent",
    "purchase_units"
  ],
  "properties": {
    "intent": {
      "$ref": "#/components/schemas/checkout_payment_intent"
    },
    "payer": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payer"
        },
        {
          "description": "DEPRECATED. The customer is also known as the payer. The Payer object was intended to only be used with the `payment_source.paypal` object. In order to make this design more clear, the details in the `payer` object are now available under `payment_source.paypal`. Please use `payment_source.paypal`. <b>DEPRECATED</b><br><table><tr><th>See</th><th>Since Version</th></tr><tr><td>payment_source.paypal</td><td>2.9</td></tr></table>",
          "deprecated": true
        }
      ]
    },
    "purchase_units": {
      "description": "An array of purchase units. Each purchase unit establishes a contract between a payer and the payee. Each purchase unit represents either a full or partial order that the payer intends to purchase from the payee.",
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/purchase_unit_request"
          },
          {
            "title": "purchase_unit",
            "description": "The purchase unit. Establishes a contract between a payer and the payee."
          }
        ]
      }
    },
    "payment_source": {
      "$ref": "#/components/schemas/payment_source"
    },
    "application_context": {
      "allOf": [
        {
          "$ref": "#/components/schemas/order_application_context"
        },
        {
          "title": "application_context",
          "description": "Customize the payer experience during the approval process for the payment with PayPal."
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/responses/403_error_response
{
  "description": "Forbidden.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic 'Forbidden' error.",
          "description": "Example response for a forbidden request.",
          "value": {
            "name": "NOT_AUTHORIZED",
            "debug_id": "b1d1f06c7246c",
            "message": "Authorization failed due to insufficient permissions."
          }
        }
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/order
{
  "title": "Order",
  "description": "The order details.",
  "type": "object",
  "allOf": [
    {
      "allOf": [
        {
          "$ref": "#/components/schemas/activity_timestamps"
        },
        {
          "title": "activity_timestamps"
        }
      ]
    },
    {
      "type": "object",
      "title": "Order",
      "description": "The order details.",
      "properties": {
        "id": {
          "description": "The ID of the order.",
          "type": "string",
          "minLength": 0,
          "maxLength": 2147483647,
          "pattern": "^[\\S\\s]*$",
          "readOnly": true
        },
        "payment_source": {
          "allOf": [
            {
              "$ref": "#/components/schemas/payment_source_response"
            }
          ]
        },
        "intent": {
          "allOf": [
            {
              "$ref": "#/components/schemas/checkout_payment_intent"
            }
          ]
        },
        "payer": {
          "allOf": [
            {
              "$ref": "#/components/schemas/payer"
            },
            {
              "description": "DEPRECATED. The customer is also known as the payer. The Payer object was intended to only be used with the `payment_source.paypal` object. In order to make this design more clear, the details in the `payer` object are now available under `payment_source.paypal`. Please use `payment_source.paypal`. <b>DEPRECATED</b><br><table><tr><th>See</th><th>Since Version</th></tr><tr><td>payment_source.paypal</td><td>2.9</td></tr></table>",
              "deprecated": true
            }
          ]
        },
        "purchase_units": {
          "description": "An array of purchase units. Each purchase unit establishes a contract between a customer and merchant. Each purchase unit represents either a full or partial order that the customer intends to purchase from the merchant.",
          "type": "array",
          "minItems": 1,
          "maxItems": 10,
          "items": {
            "allOf": [
              {
                "$ref": "#/components/schemas/purchase_unit"
              },
              {
                "title": "purchase_unit",
                "description": "A purchase unit. Establishes a contract between a customer and merchant."
              }
            ]
          }
        },
        "status": {
          "allOf": [
            {
              "$ref": "#/components/schemas/order_status"
            },
            {
              "readOnly": true
            }
          ]
        },
        "links": {
          "description": "An array of request-related HATEOAS links. To complete payer approval, use the `approve` link to redirect the payer. The API caller has 6 hours (default setting, this which can be changed by your account manager to 24/48/72 hours to accommodate your use case) from the time the order is created, to redirect your payer. Once redirected, the API caller has 6 hours for the payer to approve the order and either authorize or capture the order. If you are not using the PayPal JavaScript SDK to initiate PayPal Checkout (in context) ensure that you include `application_context.return_url` is specified or you will get \"We're sorry, Things don't appear to be working at the moment\" after the payer approves the payment.",
          "type": "array",
          "minItems": 0,
          "maxItems": 32767,
          "readOnly": true,
          "items": {
            "allOf": [
              {
                "$ref": "#/components/schemas/link_description-2"
              },
              {
                "title": "link_description",
                "description": "A request-related [HATEOAS link](/api/rest/responses/#hateoas-links). To complete payer approval, use the `approve` link with the `GET` method."
              }
            ]
          }
        }
      }
    }
  ]
}


## payments_payment_v2.json #/components/responses/404_error_response
{
  "description": "Not Found.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic 'Not Found' error.",
          "description": "Example response for a request to a resource that does not exist.",
          "value": {
            "name": "RESOURCE_NOT_FOUND",
            "debug_id": "b1d1f06c7246c",
            "message": "The specified resource does not exist."
          }
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/responses/500_error_response
{
  "description": "Internal Server Error.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic internal server error.",
          "description": "Example response for a request that fails for reasons internal to the server.",
          "value": {
            "name": "INTERNAL_SERVER_ERROR",
            "debug_id": "b1d1f06c7246c",
            "message": "An internal server error has occurred."
          }
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/responses/default_response
{
  "description": "Default response.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Default response.",
          "description": "Example catch all response, should not be encountered in practice.",
          "value": {
            "name": "INTERNAL_SERVER_ERROR",
            "debug_id": "b1d1f06c7246c",
            "message": "An internal server error has occurred."
          }
        }
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/error
{
  "title": "Error",
  "description": "The error details.",
  "type": "object",
  "required": [
    "debug_id",
    "message",
    "name"
  ],
  "properties": {
    "name": {
      "description": "The human-readable, unique name of the error.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "message": {
      "description": "The message that describes the error.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "debug_id": {
      "description": "The PayPal internal ID. Used for correlation purposes.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "details": {
      "description": "An array of additional details about the error.",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/error_details"
          },
          {
            "title": "error_details"
          }
        ]
      }
    },
    "links": {
      "description": "An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "readOnly": true,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/link_description"
          },
          {
            "title": "link_description",
            "readOnly": true
          }
        ]
      }
    }
  }
}


## payments_payment_v2.json #/components/parameters/paypal_request_id
{
  "name": "PayPal-Request-Id",
  "in": "header",
  "description": "A unique ID identifying the request header for idempotency purposes.",
  "required": false,
  "schema": {
    "description": "A unique ID identifying the request header for idempotency purposes.",
    "type": "string",
    "minLength": 1,
    "maxLength": 10000,
    "pattern": "^.*$"
  },
  "examples": {
    "request_id": {
      "summary": "A request id.",
      "description": "A paypal-request-id header with a randomized value.",
      "value": "17e81d06-77ab-11e8-adc0-fa71639ebebc"
    }
  }
}


## checkout_orders_v2.json #/components/responses/401_error_response
{
  "description": "Unauthorized.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic 'Unauthorized' error.",
          "description": "Example response for unauthorized request.",
          "value": {
            "name": "AUTHENTICATION_FAILURE",
            "debug_id": "b1d1f06c7246c",
            "message": "Authentication failed due to missing Authorization header, or invalid authentication credentials."
          }
        }
      }
    }
  }
}


## checkout_orders_v2.json #/components/responses/403_error_response
{
  "description": "Forbidden.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic 'Forbidden' error.",
          "description": "Example response for a forbidden request.",
          "value": {
            "name": "NOT_AUTHORIZED",
            "debug_id": "b1d1f06c7246c",
            "message": "Authorization failed due to insufficient permissions."
          }
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/parameters/paypal_auth_assertion
{
  "name": "PayPal-Auth-Assertion",
  "in": "header",
  "description": "Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.",
  "required": false,
  "schema": {
    "description": "Header for an API client-provided JWT assertion that identifies the merchant. Establishing the consent to act-on-behalf of a merchant is a prerequisite for using this header.",
    "type": "string",
    "minLength": 1,
    "maxLength": 10000,
    "pattern": "^.*$"
  },
  "examples": {
    "auth_assertion": {
      "summary": "An auth assertion.",
      "description": "A paypal-auth-assertion header with a randomized value.",
      "value": "eyJhbGciOiJub25lIn0.eyJlbWFpbCI6Im15QGVtYWlsLmNvbSJ9"
    }
  }
}


## payments_payment_v2.json #/components/schemas/refund_request
{
  "title": "Refund Request",
  "description": "Refunds a captured payment, by ID. For a full refund, include an empty request body. For a partial refund, include an <code>amount</code> object in the request body.",
  "type": "object",
  "properties": {
    "amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The amount to refund. To refund a portion of the captured amount, specify an amount. If amount is not specified, an amount equal to <code>captured amount - previous refunds</code> is refunded. The amount must be a positive number and in the same currency as the one in which the payment was captured."
        }
      ]
    },
    "custom_id": {
      "description": "The API caller-provided external ID. Used to reconcile API caller-initiated transactions with PayPal transactions. Appears in transaction and settlement reports. The pattern is defined by an external party and supports Unicode.",
      "type": "string",
      "minLength": 1,
      "maxLength": 127,
      "pattern": "^.*$"
    },
    "invoice_id": {
      "description": "The API caller-provided external invoice ID for this order. The pattern is defined by an external party and supports Unicode.",
      "type": "string",
      "minLength": 1,
      "maxLength": 127,
      "pattern": "^.*$"
    },
    "note_to_payer": {
      "description": "The reason for the refund. Appears in both the payer's transaction history and the emails that the payer receives. The pattern is defined by an external party and supports Unicode.",
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "pattern": "^.*$"
    },
    "payment_instruction": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payment_instruction-2"
        },
        {
          "description": "Any additional refund instructions to be set during refund payment processing. This object is only applicable to merchants that have been enabled for PayPal Commerce Platform for Marketplaces and Platforms capability. Please speak to your account manager if you want to use this capability."
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/responses/500_error_response
{
  "description": "Internal Server Error.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic internal server error.",
          "description": "Example response for a request that fails for reasons internal to the server.",
          "value": {
            "name": "INTERNAL_SERVER_ERROR",
            "debug_id": "b1d1f06c7246c",
            "message": "An internal server error has occurred."
          }
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/schemas/refund
{
  "title": "refund",
  "description": "The refund information.",
  "type": "object",
  "allOf": [
    {
      "allOf": [
        {
          "$ref": "#/components/schemas/refund_status"
        }
      ]
    },
    {
      "title": "Refund Properties",
      "description": "The detailed properties of the refund transaction, including identifiers, amounts, breakdowns, and associated metadata.",
      "type": "object",
      "properties": {
        "id": {
          "description": "The PayPal-generated ID for the refund.",
          "type": "string",
          "minLength": 0,
          "maxLength": 2147483647,
          "pattern": "^[\\S\\s]*$",
          "readOnly": true
        },
        "amount": {
          "allOf": [
            {
              "$ref": "#/components/schemas/money"
            },
            {
              "description": "The amount that the payee refunded to the payer.",
              "readOnly": true
            }
          ]
        },
        "invoice_id": {
          "description": "The API caller-provided external invoice number for this order. Appears in both the payer's transaction history and the emails that the payer receives.",
          "type": "string",
          "minLength": 0,
          "maxLength": 2147483647,
          "pattern": "^[\\S\\s]*$",
          "readOnly": true
        },
        "custom_id": {
          "description": "The API caller-provided external ID. Used to reconcile API caller-initiated transactions with PayPal transactions. Appears in transaction and settlement reports.",
          "type": "string",
          "minLength": 1,
          "maxLength": 255,
          "pattern": "^[A-Za-z0-9-_.,]*$"
        },
        "acquirer_reference_number": {
          "description": "Reference ID issued for the card transaction. This ID can be used to track the transaction across processors, card brands and issuing banks.",
          "type": "string",
          "minLength": 1,
          "maxLength": 36,
          "pattern": "^[a-zA-Z0-9]+$"
        },
        "note_to_payer": {
          "description": "The reason for the refund. Appears in both the payer's transaction history and the emails that the payer receives.",
          "type": "string",
          "minLength": 0,
          "maxLength": 2147483647,
          "pattern": "^[\\S\\s]*$",
          "readOnly": true
        },
        "seller_payable_breakdown": {
          "title": "Seller Payable Breakdown",
          "description": "The breakdown of the refund.",
          "type": "object",
          "readOnly": true,
          "properties": {
            "gross_amount": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/money"
                },
                {
                  "description": "The amount that the payee refunded to the payer.",
                  "readOnly": true
                }
              ]
            },
            "paypal_fee": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/money"
                },
                {
                  "description": "The PayPal fee that was refunded to the payer in the currency of the transaction. This fee might not match the PayPal fee that the payee paid when the payment was captured.",
                  "readOnly": true
                }
              ]
            },
            "paypal_fee_in_receivable_currency": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/money"
                },
                {
                  "description": "The PayPal fee that was refunded to the payer in the receivable currency. Returned only in cases when the receivable currency is different from transaction currency. Example 'CNY'.",
                  "readOnly": true
                }
              ]
            },
            "net_amount": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/money"
                },
                {
                  "description": "The net amount that the payee's account is debited in the transaction currency. The net amount is calculated as <code>gross_amount</code> minus <code>paypal_fee</code> minus <code>platform_fees</code>.",
                  "readOnly": true
                }
              ]
            },
            "net_amount_in_receivable_currency": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/money"
                },
                {
                  "description": "The net amount that the payee's account is debited in the receivable currency. Returned only in cases when the receivable currency is different from transaction currency. Example 'CNY'.",
                  "readOnly": true
                }
              ]
            },
            "platform_fees": {
              "description": "An array of platform or partner fees, commissions, or brokerage fees for the refund.",
              "type": "array",
              "minItems": 0,
              "maxItems": 1,
              "items": {
                "allOf": [
                  {
                    "$ref": "#/components/schemas/platform_fee"
                  },
                  {
                    "title": "platform_fee"
                  }
                ]
              }
            },
            "net_amount_breakdown": {
              "description": "An array of breakdown values for the net amount. Returned when the currency of the refund is different from the currency of the PayPal account where the payee holds their funds.",
              "type": "array",
              "minItems": 0,
              "maxItems": 32767,
              "readOnly": true,
              "items": {
                "allOf": [
                  {
                    "$ref": "#/components/schemas/net_amount_breakdown_item"
                  },
                  {
                    "title": "net_amount_breakdown_item"
                  }
                ]
              }
            },
            "total_refunded_amount": {
              "allOf": [
                {
                  "$ref": "#/components/schemas/money"
                },
                {
                  "description": "The total amount refunded from the original capture to date. For example, if a payer makes a $100 purchase and was refunded $20 a week ago and was refunded $30 in this refund, the `gross_amount` is $30 for this refund and the `total_refunded_amount` is $50."
                }
              ]
            }
          }
        },
        "payer": {
          "allOf": [
            {
              "$ref": "#/components/schemas/payee_base"
            },
            {
              "description": "The details associated with the merchant for this transaction.",
              "readOnly": true
            }
          ]
        },
        "links": {
          "description": "An array of related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).",
          "type": "array",
          "minItems": 0,
          "maxItems": 32767,
          "readOnly": true,
          "items": {
            "allOf": [
              {
                "$ref": "#/components/schemas/link_description-2"
              },
              {
                "title": "link_description"
              }
            ]
          }
        }
      }
    },
    {
      "allOf": [
        {
          "$ref": "#/components/schemas/activity_timestamps"
        }
      ]
    }
  ]
}


## checkout_orders_v2.json #/components/responses/default_response
{
  "description": "Default response.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Default response.",
          "description": "Example catch all response, should not be encountered in practice.",
          "value": {
            "name": "INTERNAL_SERVER_ERROR",
            "debug_id": "b1d1f06c7246c",
            "message": "An internal server error has occurred."
          }
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/schemas/error
{
  "title": "Error",
  "description": "The error details.",
  "type": "object",
  "required": [
    "debug_id",
    "message",
    "name"
  ],
  "properties": {
    "name": {
      "description": "The human-readable, unique name of the error.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "message": {
      "description": "The message that describes the error.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "debug_id": {
      "description": "The PayPal internal ID. Used for correlation purposes.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "details": {
      "description": "An array of additional details about the error.",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/error_details"
          },
          {
            "title": "error_details"
          }
        ]
      }
    },
    "links": {
      "description": "An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links).",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "readOnly": true,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/link_description"
          },
          {
            "title": "link_description",
            "readOnly": true
          }
        ]
      }
    }
  }
}


## checkout_orders_v2.json #/components/responses/404_error_response
{
  "description": "Not Found.",
  "content": {
    "application/json": {
      "schema": {
        "$ref": "#/components/schemas/error"
      },
      "examples": {
        "generic": {
          "summary": "Generic 'Not Found' error.",
          "description": "Example response for a request to a resource that does not exist.",
          "value": {
            "name": "RESOURCE_NOT_FOUND",
            "debug_id": "b1d1f06c7246c",
            "message": "The specified resource does not exist."
          }
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/callbacks/capture_refunded
{
  "captures/{$request.path.capture_id}/refunds": {
    "post": {
      "summary": "Capture refunded notification",
      "description": "Notification sent when a capture is refunded.",
      "operationId": "captures.refunded.callback",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "title": "Capture Refunded Event",
              "description": "Webhook event notification for capture refunded.",
              "properties": {
                "id": {
                  "type": "string",
                  "description": "The ID of the webhook event notification.",
                  "minLength": 1,
                  "maxLength": 255,
                  "pattern": "^.*$"
                },
                "event_version": {
                  "type": "string",
                  "description": "The version of the event.",
                  "minLength": 1,
                  "maxLength": 50,
                  "pattern": "^.*$"
                },
                "create_time": {
                  "description": "The date and time when the webhook event notification was created.",
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/date_time"
                    }
                  ]
                },
                "resource_type": {
                  "type": "string",
                  "description": "The name of the resource related to the webhook notification event.",
                  "minLength": 1,
                  "maxLength": 100,
                  "pattern": "^.*$"
                },
                "resource_version": {
                  "type": "string",
                  "description": "The version of the resource.",
                  "minLength": 1,
                  "maxLength": 50,
                  "pattern": "^.*$"
                },
                "event_type": {
                  "type": "string",
                  "description": "The event that triggered the webhook event notification.",
                  "enum": [
                    "PAYMENT.CAPTURE.REFUNDED"
                  ]
                },
                "summary": {
                  "type": "string",
                  "description": "A summary description for the event notification.",
                  "minLength": 1,
                  "maxLength": 500,
                  "pattern": "^.*$"
                },
                "resource": {
                  "allOf": [
                    {
                      "$ref": "#/components/schemas/refund"
                    }
                  ]
                },
                "links": {
                  "type": "array",
                  "description": "An array of request-related HATEOAS links.",
                  "minItems": 1,
                  "maxItems": 10,
                  "items": {
                    "$ref": "#/components/schemas/link_description-2"
                  }
                }
              }
            },
            "examples": {
              "capture_refunded": {
                "summary": "Capture refunded event",
                "description": "Webhook notification when a capture is refunded.",
                "value": {
                  "id": "WH-3UE850097C805102A-18305212AB1299210",
                  "event_version": "1.0",
                  "create_time": "2022-10-27T22:34:27.088Z",
                  "resource_type": "refund",
                  "resource_version": "2.0",
                  "event_type": "PAYMENT.CAPTURE.REFUNDED",
                  "summary": "A $ 5.0 USD capture payment was refunded",
                  "resource": {
                    "seller_payable_breakdown": {
                      "total_refunded_amount": {
                        "value": "5.00",
                        "currency_code": "USD"
                      },
                      "paypal_fee": {
                        "value": "0.00",
                        "currency_code": "USD"
                      },
                      "gross_amount": {
                        "value": "5.00",
                        "currency_code": "USD"
                      },
                      "net_amount": {
                        "value": "5.00",
                        "currency_code": "USD"
                      }
                    },
                    "amount": {
                      "value": "5.00",
                      "currency_code": "USD"
                    },
                    "update_time": "2022-10-27T15:34:22-07:00",
                    "create_time": "2022-10-27T15:34:22-07:00",
                    "invoice_id": "1666910062",
                    "links": [
                      {
                        "method": "GET",
                        "rel": "self",
                        "href": "https://api-m.paypal.com/v2/payments/refunds/3NG36268BJ600681V"
                      },
                      {
                        "method": "GET",
                        "rel": "up",
                        "href": "https://api-m.paypal.com/v2/payments/captures/27C890397M291943E"
                      }
                    ],
                    "id": "3NG36268BJ600681V",
                    "note_to_payer": "Defective product",
                    "status": "COMPLETED"
                  },
                  "links": [
                    {
                      "href": "https://api-m.paypal.com/v1/notifications/webhooks-events/WH-3UE850097C805102A-18305212AB1299210",
                      "rel": "self",
                      "method": "GET"
                    },
                    {
                      "href": "https://api-m.paypal.com/v1/notifications/webhooks-events/WH-3UE850097C805102A-18305212AB1299210/resend",
                      "rel": "resend",
                      "method": "POST"
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "responses": {
        "204": {
          "description": "Your server implementation should return this HTTP status code if the data was received successfully."
        },
        "400": {
          "description": "Your server should return this HTTP status code if the request is malformed.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/error"
              },
              "examples": {
                "invalid_request": {
                  "summary": "Invalid webhook request.",
                  "description": "Request with malformed data.",
                  "value": {
                    "name": "INVALID_REQUEST",
                    "debug_id": "b1d1f06c7246c",
                    "message": "Request is not well-formed, syntactically incorrect, or violates schema.",
                    "details": [
                      {
                        "field": "/event_type",
                        "location": "body",
                        "issue": "INVALID_PARAMETER_SYNTAX",
                        "description": "The value of a field does not conform to the expected format."
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "500": {
          "$ref": "#/components/responses/500_error_response"
        }
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/order_capture_request
{
  "title": "Order Capture Request",
  "description": "Completes an capture payment for an order.",
  "type": "object",
  "properties": {
    "payment_source": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payment_source"
        },
        {
          "not": {
            "anyOf": [
              {
                "required": [
                  "afterpay"
                ]
              },
              {
                "required": [
                  "bancontact"
                ]
              },
              {
                "required": [
                  "blik"
                ]
              },
              {
                "required": [
                  "bizum"
                ]
              },
              {
                "required": [
                  "blik_pay_later"
                ]
              },
              {
                "required": [
                  "crypto"
                ]
              },
              {
                "required": [
                  "dragonpay"
                ]
              },
              {
                "required": [
                  "eps"
                ]
              },
              {
                "required": [
                  "estonia_banks"
                ]
              },
              {
                "required": [
                  "fiuu_cash"
                ]
              },
              {
                "required": [
                  "floa_pay"
                ]
              },
              {
                "required": [
                  "fpx"
                ]
              },
              {
                "required": [
                  "giropay"
                ]
              },
              {
                "required": [
                  "gopay"
                ]
              },
              {
                "required": [
                  "ideal"
                ]
              },
              {
                "required": [
                  "klarna"
                ]
              },
              {
                "required": [
                  "latvia_banks"
                ]
              },
              {
                "required": [
                  "lithuania_banks"
                ]
              },
              {
                "required": [
                  "mybank"
                ]
              },
              {
                "required": [
                  "paysafecard"
                ]
              },
              {
                "required": [
                  "pix_international"
                ]
              },
              {
                "required": [
                  "p24"
                ]
              },
              {
                "required": [
                  "skrill"
                ]
              },
              {
                "required": [
                  "paysera"
                ]
              },
              {
                "required": [
                  "scalapay"
                ]
              },
              {
                "required": [
                  "sofort"
                ]
              },
              {
                "required": [
                  "swish"
                ]
              },
              {
                "required": [
                  "thailand_banks"
                ]
              },
              {
                "required": [
                  "trustly"
                ]
              },
              {
                "required": [
                  "wero"
                ]
              },
              {
                "required": [
                  "zip"
                ]
              },
              {
                "required": [
                  "doku"
                ]
              },
              {
                "required": [
                  "alfamart"
                ]
              },
              {
                "required": [
                  "indomaret"
                ]
              },
              {
                "required": [
                  "indonesia_banks"
                ]
              },
              {
                "required": [
                  "jenius_pay"
                ]
              },
              {
                "required": [
                  "kredivo"
                ]
              },
              {
                "required": [
                  "linkaja"
                ]
              },
              {
                "required": [
                  "ovo"
                ]
              }
            ]
          }
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/standard_header_schema
{
  "title": "Schema Object for standard headers",
  "description": "Standard headers are generally less restrictive in structure due to historical precedent across browsers, etc. This is a common schema for use in defining most standard headers.",
  "type": "string",
  "minLength": 1,
  "maxLength": 16000,
  "pattern": "^.*$"
}


## payments_payment_v2.json #/components/schemas/capture
{
  "title": "capture",
  "description": "A captured payment.",
  "type": "object",
  "allOf": [
    {
      "$ref": "#/components/schemas/capture_status"
    },
    {
      "type": "object",
      "properties": {
        "id": {
          "description": "The PayPal-generated ID for the captured payment.",
          "type": "string",
          "minLength": 0,
          "maxLength": 2147483647,
          "pattern": "^[\\S\\s]*$",
          "readOnly": true
        },
        "amount": {
          "allOf": [
            {
              "$ref": "#/components/schemas/amount_with_breakdown"
            },
            {
              "description": "The amount for this captured payment.",
              "readOnly": true
            }
          ]
        },
        "invoice_id": {
          "description": "The API caller-provided external invoice number for this order. Appears in both the payer's transaction history and the emails that the payer receives.",
          "type": "string",
          "minLength": 0,
          "maxLength": 2147483647,
          "pattern": "^[\\S\\s]*$",
          "readOnly": true
        },
        "custom_id": {
          "description": "The API caller-provided external ID. Used to reconcile API caller-initiated transactions with PayPal transactions. Appears in transaction and settlement reports.",
          "type": "string",
          "minLength": 0,
          "maxLength": 255,
          "pattern": "^[\\S\\s]*$"
        },
        "network_transaction_reference": {
          "allOf": [
            {
              "$ref": "#/components/schemas/network_transaction"
            }
          ]
        },
        "seller_protection": {
          "allOf": [
            {
              "$ref": "#/components/schemas/seller_protection"
            },
            {
              "readOnly": true
            }
          ]
        },
        "final_capture": {
          "description": "Indicates whether you can make additional captures against the authorized payment. Set to `true` if you do not intend to capture additional payments against the authorization. Set to `false` if you intend to capture additional payments against the authorization.",
          "type": "boolean",
          "default": false,
          "readOnly": true
        },
        "seller_receivable_breakdown": {
          "allOf": [
            {
              "$ref": "#/components/schemas/seller_receivable_breakdown"
            },
            {
              "readOnly": true
            }
          ]
        },
        "disbursement_mode": {
          "allOf": [
            {
              "$ref": "#/components/schemas/disbursement_mode"
            }
          ]
        },
        "links": {
          "description": "An array of related [HATEOAS links](/docs/api/reference/api-responses/#hateoas-links).",
          "type": "array",
          "minItems": 0,
          "maxItems": 32767,
          "readOnly": true,
          "items": {
            "allOf": [
              {
                "$ref": "#/components/schemas/link_description-2"
              },
              {
                "title": "link_description"
              }
            ]
          }
        },
        "processor_response": {
          "allOf": [
            {
              "$ref": "#/components/schemas/processor_response"
            },
            {
              "description": "An object that provides additional processor information for a direct credit card transaction."
            }
          ]
        }
      }
    },
    {
      "allOf": [
        {
          "$ref": "#/components/schemas/activity_timestamps"
        }
      ]
    }
  ]
}


## payments_payment_v2.json #/components/schemas/supplementary_data
{
  "title": "Payment Supplementary Data",
  "description": "The supplementary data.",
  "type": "object",
  "properties": {
    "related_ids": {
      "allOf": [
        {
          "$ref": "#/components/schemas/related_ids"
        },
        {
          "readOnly": true
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/payee_base
{
  "title": "payee_base",
  "description": "The details for the merchant who receives the funds and fulfills the order. The merchant is also known as the payee.",
  "type": "object",
  "properties": {
    "email_address": {
      "allOf": [
        {
          "$ref": "#/components/schemas/email"
        },
        {
          "description": "The email address of merchant."
        }
      ]
    },
    "merchant_id": {
      "allOf": [
        {
          "$ref": "#/components/schemas/account_id-2"
        },
        {
          "description": "The encrypted PayPal account ID of the merchant."
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/guid
{
  "title": "GUID",
  "description": "A Globally Unique Identifier (GUID) value.",
  "type": "string",
  "minLength": 1,
  "maxLength": 68,
  "pattern": "^[A-Za-z0-9-{}(),]*$"
}


## checkout_orders_v2.json #/components/schemas/standard_header_schema
{
  "title": "Schema Object for standard headers",
  "description": "Standard headers are generally less restrictive in structure due to historical precedent across browsers, etc. This is a common schema for use in defining most standard headers.",
  "type": "string",
  "minLength": 1,
  "maxLength": 16000,
  "pattern": "^.*$"
}


## checkout_orders_v2.json #/components/schemas/checkout_payment_intent
{
  "title": "checkout_payment_intent",
  "description": "The intent to either capture payment immediately or authorize a payment for an order after order creation.",
  "type": "string",
  "enum": [
    "CAPTURE",
    "AUTHORIZE"
  ]
}


## payments_payment_v2.json #/components/schemas/money
{
  "title": "Money",
  "description": "The currency and amount for a financial transaction, such as a balance or payment due.",
  "type": "object",
  "required": [
    "currency_code",
    "value"
  ],
  "properties": {
    "currency_code": {
      "$ref": "#/components/schemas/currency_code"
    },
    "value": {
      "description": "The value, which might be:<ul><li>An integer for currencies like `JPY` that are not typically fractional.</li><li>A decimal fraction for currencies like `TND` that are subdivided into thousandths.</li></ul>For the required number of decimal places for a currency code, see [Currency Codes](/api/rest/reference/currency-codes/).",
      "type": "string",
      "minLength": 0,
      "maxLength": 32,
      "pattern": "^((-?[0-9]+)|(-?([0-9]+)?[.][0-9]+))$"
    }
  }
}


## checkout_orders_v2.json #/components/schemas/payer
{
  "title": "payer",
  "description": "The customer who approves and pays for the order. The customer is also known as the payer.",
  "type": "object",
  "allOf": [
    {
      "$ref": "#/components/schemas/payer_base"
    },
    {
      "type": "object",
      "properties": {
        "name": {
          "allOf": [
            {
              "$ref": "#/components/schemas/name"
            },
            {
              "description": "The name of the payer. Supports only the `given_name` and `surname` properties.",
              "not": {
                "anyOf": [
                  {
                    "required": [
                      "prefix"
                    ]
                  },
                  {
                    "required": [
                      "middle_name"
                    ]
                  },
                  {
                    "required": [
                      "suffix"
                    ]
                  },
                  {
                    "required": [
                      "alternate_full_name"
                    ]
                  },
                  {
                    "required": [
                      "full_name"
                    ]
                  }
                ]
              }
            }
          ]
        },
        "phone": {
          "allOf": [
            {
              "$ref": "#/components/schemas/phone_with_type"
            },
            {
              "description": "The phone number of the customer. Available only when you enable the **Contact Telephone Number** option in the <a href=\"https://www.paypal.com/cgi-bin/customerprofileweb?cmd=_profile-website-payments\">**Profile & Settings**</a> for the merchant's PayPal account. The `phone.phone_number` supports only `national_number`."
            }
          ]
        },
        "birth_date": {
          "allOf": [
            {
              "$ref": "#/components/schemas/date_no_time"
            },
            {
              "description": "The birth date of the payer in `YYYY-MM-DD` format."
            }
          ]
        },
        "tax_info": {
          "allOf": [
            {
              "$ref": "#/components/schemas/tax_info"
            },
            {
              "description": "The tax information of the payer. Required only for Brazilian payer's. Both `tax_id` and `tax_id_type` are required."
            }
          ]
        },
        "address": {
          "allOf": [
            {
              "$ref": "#/components/schemas/address_portable"
            },
            {
              "description": "The address of the payer. Supports only the `address_line_1`, `address_line_2`, `admin_area_1`, `admin_area_2`, `postal_code`, and `country_code` properties. Also referred to as the billing address of the customer.",
              "not": {
                "anyOf": [
                  {
                    "required": [
                      "address_line_3"
                    ]
                  },
                  {
                    "required": [
                      "admin_area_3"
                    ]
                  },
                  {
                    "required": [
                      "admin_area_4"
                    ]
                  },
                  {
                    "required": [
                      "address_details"
                    ]
                  }
                ]
              }
            }
          ]
        }
      }
    }
  ]
}


## payments_payment_v2.json #/components/schemas/payment_instruction-2
{
  "title": "payment_instruction",
  "description": "Any additional payments instructions during refund payment processing. This object is only applicable to merchants that have been enabled for PayPal Commerce Platform for Marketplaces and Platforms capability. Please speak to your account manager if you want to use this capability.",
  "type": "object",
  "properties": {
    "platform_fees": {
      "description": "Specifies the amount that the API caller will contribute to the refund being processed. The amount needs to be lower than platform_fees amount originally captured or the amount that is remaining if multiple refunds have been processed. This field is only applicable to merchants that have been enabled for PayPal Commerce Platform for Marketplaces and Platforms capability. Please speak to your account manager if you want to use this capability.",
      "type": "array",
      "minItems": 0,
      "maxItems": 1,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/platform_fee"
          },
          {
            "title": "platform_fee",
            "not": {
              "required": [
                "payee"
              ]
            }
          }
        ]
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/purchase_unit_request
{
  "title": "Purchase Unit Request",
  "description": "The purchase unit request. Includes required information for the payment contract.",
  "type": "object",
  "required": [
    "amount"
  ],
  "properties": {
    "reference_id": {
      "description": "The API caller-provided external ID for the purchase unit. Required for multiple purchase units when you must update the order through `PATCH`. If you omit this value and the order contains only one purchase unit, PayPal sets this value to `default`.",
      "type": "string",
      "minLength": 1,
      "maxLength": 256,
      "pattern": "^[\\S\\s]*$"
    },
    "amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/amount_with_breakdown"
        },
        {
          "description": "The total order amount with an optional breakdown that provides details, such as the total item amount, total tax amount, shipping, handling, insurance, and discounts, if any.<br/>If you specify `amount.breakdown`, the amount equals `item_total` plus `tax_total` plus `shipping` plus `handling` plus `insurance` minus `shipping_discount` minus discount.<br/>The amount must be a positive number. The `amount.value` field supports up to 15 digits preceding the decimal. For a list of supported currencies, decimal precision, and maximum charge amount, see the PayPal REST APIs <a href=\"https://developer.paypal.com/api/rest/reference/currency-codes/\">Currency Codes</a>."
        }
      ]
    },
    "payee": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payee"
        },
        {
          "description": "The merchant who receives payment for this transaction."
        }
      ]
    },
    "payment_instruction": {
      "$ref": "#/components/schemas/payment_instruction"
    },
    "description": {
      "description": "<blockquote>This field supports up to 3,000 characters, but <strong>any content beyond 127 characters (including spaces) will be truncated. The 127 character limit is reflected in the response</strong> representation of this field.</blockquote>The purchase description. The maximum length of the character is dependent on the type of characters used. The character length is specified assuming a US ASCII character. Depending on type of character; (e.g. accented character, Japanese characters) the number of characters that that can be specified as input might not equal the permissible max length.",
      "type": "string",
      "minLength": 1,
      "maxLength": 3000,
      "pattern": "^[\\S\\s]*$"
    },
    "custom_id": {
      "description": "The API caller-provided external ID. Used to reconcile client transactions with PayPal transactions. Appears in transaction and settlement reports but is not visible to the payer.",
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "pattern": "^[\\S\\s]*$"
    },
    "invoice_id": {
      "description": "The API caller-provided external invoice number for this order. Appears in both the payer's transaction history and the emails that the payer receives. invoice_id values are required to be unique within each merchant account by default. Although the uniqueness validation is configurable, disabling this behavior will remove the account's ability to use invoice_id in other APIs as an identifier. It is highly recommended to keep a unique invoice_id for each Order.",
      "type": "string",
      "minLength": 1,
      "maxLength": 127,
      "pattern": "^[\\S\\s]*$"
    },
    "soft_descriptor": {
      "description": "<blockquote>This field supports up to 127 characters, but <strong>any content beyond 22 characters (including spaces) will be truncated. The 22 character limit is reflected in the response</strong> representation of this field.</blockquote>The soft descriptor is the dynamic text used to construct the statement descriptor that appears on a payer's card statement.<br><br>If an Order is paid using the \"PayPal Wallet\", the statement descriptor will appear in following format on the payer's card statement: <code><var>PAYPAL_prefix</var>+(space)+<var>merchant_descriptor</var>+(space)+ <var>soft_descriptor</var></code><blockquote><strong>Note:</strong> The merchant descriptor is the descriptor of the merchant’s payment receiving preferences which can be seen by logging into the merchant account https://www.sandbox.paypal.com/businessprofile/settings/info/edit</blockquote>The <code>PAYPAL</code> prefix uses 8 characters. Only the first 22 characters will be displayed in the statement. <br>For example, if:<ul><li>The PayPal prefix toggle is <code>PAYPAL *</code>.</li><li>The merchant descriptor in the profile is <code>Janes Gift</code>.</li><li>The soft descriptor is <code>800-123-1234</code>.</li></ul>Then, the statement descriptor on the card is <code>PAYPAL * Janes Gift 80</code>.",
      "type": "string",
      "minLength": 1,
      "maxLength": 1000,
      "pattern": "^[\\S\\s]*$"
    },
    "items": {
      "description": "An array of items that the customer purchases from the merchant.",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/item_request"
          },
          {
            "title": "item",
            "description": "The item."
          }
        ]
      }
    },
    "shipping": {
      "allOf": [
        {
          "$ref": "#/components/schemas/shipping_detail"
        },
        {
          "description": "The name and address of the person to whom to ship the items."
        }
      ]
    },
    "supplementary_data": {
      "allOf": [
        {
          "$ref": "#/components/schemas/supplementary_data"
        },
        {
          "description": "Contains Supplementary Data."
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/refund_status
{
  "title": "refund_status",
  "description": "The refund status with details.",
  "type": "object",
  "properties": {
    "status": {
      "title": "Refund Status With Details",
      "description": "The status of the refund.",
      "type": "string",
      "enum": [
        "CANCELLED",
        "FAILED",
        "PENDING",
        "COMPLETED"
      ],
      "readOnly": true
    },
    "status_details": {
      "allOf": [
        {
          "$ref": "#/components/schemas/refund_status_details"
        },
        {
          "description": "The details of the refund status.",
          "readOnly": true
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/payment_source
{
  "title": "payment_source",
  "description": "The payment source definition.",
  "type": "object",
  "properties": {
    "card": {
      "$ref": "#/components/schemas/card_request"
    },
    "token": {
      "$ref": "#/components/schemas/token"
    },
    "paypal": {
      "allOf": [
        {
          "$ref": "#/components/schemas/paypal_wallet"
        },
        {
          "description": "Indicates that PayPal Wallet is the payment source. Main use of this selection is to provide additional instructions associated with this choice like vaulting."
        }
      ]
    },
    "bancontact": {
      "allOf": [
        {
          "$ref": "#/components/schemas/bancontact_request"
        },
        {
          "title": "bancontact",
          "description": "Bancontact is the most popular online payment in Belgium. [More Details](https://www.bancontact.com/)."
        }
      ]
    },
    "blik": {
      "allOf": [
        {
          "$ref": "#/components/schemas/blik_request"
        },
        {
          "title": "blik",
          "description": "BLIK is a mobile payment system, created by Polish Payment Standard in order to allow millions of users to pay in shops, payout cash in ATMs and make online purchases and payments. [More Details](https://blikmobile.pl/)."
        }
      ]
    },
    "eps": {
      "allOf": [
        {
          "$ref": "#/components/schemas/eps_request"
        },
        {
          "title": "eps",
          "description": "The eps transfer is an online payment method developed by many Austrian banks. [More Details](https://www.eps-ueberweisung.at/)."
        }
      ]
    },
    "giropay": {
      "allOf": [
        {
          "$ref": "#/components/schemas/giropay_request"
        },
        {
          "title": "giropay",
          "description": "Giropay is an Internet payment System in Germany, based on online banking. [More Details](https://giropay.de/)."
        }
      ]
    },
    "ideal": {
      "allOf": [
        {
          "$ref": "#/components/schemas/ideal_request"
        },
        {
          "title": "ideal",
          "description": "The Dutch payment method iDEAL is an online payment method that enables consumers to pay online through their own bank. [More Details](https://www.ideal.nl/)."
        }
      ]
    },
    "mybank": {
      "allOf": [
        {
          "$ref": "#/components/schemas/mybank_request"
        },
        {
          "title": "mybank",
          "description": "MyBank is an e-authorisation solution which enables safe digital payments and identity authentication through a consumer’s own online banking portal or mobile application. [More Details](https://www.mybank.eu/)."
        }
      ]
    },
    "p24": {
      "allOf": [
        {
          "$ref": "#/components/schemas/p24_request"
        },
        {
          "title": "p24",
          "description": "P24 (Przelewy24) is a secure and fast online bank transfer service linked to all the major banks in Poland. [More Details](https://www.przelewy24.pl/)."
        }
      ]
    },
    "sofort": {
      "allOf": [
        {
          "$ref": "#/components/schemas/sofort_request"
        },
        {
          "title": "sofort",
          "description": "SOFORT Banking is a real-time bank transfer payment method that buyers use to transfer funds directly to merchants from their bank accounts. [More Details](https://www.klarna.com/sofort/)."
        }
      ]
    },
    "trustly": {
      "allOf": [
        {
          "$ref": "#/components/schemas/trustly_request"
        },
        {
          "title": "trustly",
          "description": "Trustly is a payment method that allows customers to shop and pay from their bank account. [More Details](https://www.trustly.net/)."
        }
      ]
    },
    "apple_pay": {
      "allOf": [
        {
          "$ref": "#/components/schemas/apple_pay_request"
        },
        {
          "title": "applepay",
          "description": "ApplePay payment source, allows buyer to pay using ApplePay, both on Web as well as on Native."
        }
      ]
    },
    "google_pay": {
      "allOf": [
        {
          "$ref": "#/components/schemas/google_pay_request"
        },
        {
          "title": "googlepay",
          "description": "Google Pay payment source, allows buyer to pay using Google Pay."
        }
      ]
    },
    "venmo": {
      "allOf": [
        {
          "$ref": "#/components/schemas/venmo_wallet_request"
        },
        {
          "title": "venmo",
          "description": "Information needed to indicate that Venmo is being used to fund the payment."
        }
      ]
    },
    "crypto": {
      "allOf": [
        {
          "$ref": "#/components/schemas/crypto_request"
        },
        {
          "title": "crypto",
          "description": "Indicates that Crypto Wallet is the payment source."
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/order_application_context
{
  "title": "application_context",
  "description": "Customizes the payer experience during the approval process for the payment with PayPal.<blockquote><strong>Note:</strong> Partners and Marketplaces might configure <code>brand_name</code> and <code>shipping_preference</code> during partner account setup, which overrides the request values.</blockquote>",
  "type": "object",
  "properties": {
    "brand_name": {
      "description": "DEPRECATED. The label that overrides the business name in the PayPal account on the PayPal site. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.brand_name`). Please specify this field in the `experience_context` object instead of the `application_context` object.",
      "type": "string",
      "minLength": 1,
      "maxLength": 127,
      "pattern": "^[\\S\\s]*$"
    },
    "locale": {
      "allOf": [
        {
          "$ref": "#/components/schemas/language"
        },
        {
          "description": "DEPRECATED. The BCP 47-formatted locale of pages that the PayPal payment experience shows. PayPal supports a five-character code. For example, `da-DK`, `he-IL`, `id-ID`, `ja-JP`, `no-NO`, `pt-BR`, `ru-RU`, `sv-SE`, `th-TH`, `zh-CN`, `zh-HK`, or `zh-TW`.  The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.locale`). Please specify this field in the `experience_context` object instead of the `application_context` object."
        }
      ]
    },
    "landing_page": {
      "title": "Order Application Context Landing Page",
      "description": "DEPRECATED. DEPRECATED. The type of landing page to show on the PayPal site for customer checkout.  The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.landing_page`). Please specify this field in the `experience_context` object instead of the `application_context` object. <b>DEPRECATED</b><br><table><tr><th>See</th><th>Since Version</th></tr><tr><td>payment_source.paypal.experience_context.landing_page</td><td>2.9</td></tr></table>",
      "type": "string",
      "enum": [
        "LOGIN",
        "BILLING",
        "NO_PREFERENCE"
      ],
      "default": "NO_PREFERENCE",
      "deprecated": true
    },
    "shipping_preference": {
      "title": "Order Application Context Shipping Preference",
      "description": "DEPRECATED. DEPRECATED. The shipping preference:<ul><li>Displays the shipping address to the customer.</li><li>Enables the customer to choose an address on the PayPal site.</li><li>Restricts the customer from changing the address during the payment-approval process.</li></ul>.  The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.shipping_preference`). Please specify this field in the `experience_context` object instead of the `application_context` object. <b>DEPRECATED</b><br><table><tr><th>See</th><th>Since Version</th></tr><tr><td>payment_source.paypal.experience_context.shipping_preference</td><td>2.9</td></tr></table>",
      "type": "string",
      "enum": [
        "GET_FROM_FILE",
        "NO_SHIPPING",
        "SET_PROVIDED_ADDRESS"
      ],
      "default": "GET_FROM_FILE",
      "deprecated": true
    },
    "user_action": {
      "description": "DEPRECATED. Configures a <strong>Continue</strong> or <strong>Pay Now</strong> checkout flow.  The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.user_action`). Please specify this field in the `experience_context` object instead of the `application_context` object.",
      "type": "string",
      "enum": [
        "CONTINUE",
        "PAY_NOW"
      ],
      "default": "CONTINUE"
    },
    "payment_method": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payment_method"
        },
        {
          "description": "DEPRECATED. The customer and merchant payment preferences. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.payment_method_selected`). Please specify this field in the `experience_context` object instead of the `application_context` object.."
        }
      ]
    },
    "return_url": {
      "description": "DEPRECATED. The URL where the customer is redirected after the customer approves the payment. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.return_url`). Please specify this field in the `experience_context` object instead of the `application_context` object.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "format": "uri"
    },
    "cancel_url": {
      "description": "DEPRECATED. The URL where the customer is redirected after the customer cancels the payment. The fields in `application_context` are now available in the `experience_context` object under the `payment_source` which supports them (eg. `payment_source.paypal.experience_context.cancel_url`). Please specify this field in the `experience_context` object instead of the `application_context` object.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "format": "uri"
    },
    "stored_payment_source": {
      "allOf": [
        {
          "$ref": "#/components/schemas/stored_payment_source"
        },
        {
          "description": "DEPRECATED. Provides additional details to process a payment using a `payment_source` that has been stored or is intended to be stored (also referred to as stored_credential or card-on-file).<br/>Parameter compatibility:<br/><ul><li>`payment_type=ONE_TIME` is compatible only with `payment_initiator=CUSTOMER`.</li><li>`usage=FIRST` is compatible only with `payment_initiator=CUSTOMER`.</li><li>`previous_transaction_reference` or `previous_network_transaction_reference` is compatible only with `payment_initiator=MERCHANT`.</li><li>Only one of the parameters - `previous_transaction_reference` and `previous_network_transaction_reference` - can be present in the request.</li></ul>.  The fields in `stored_payment_source` are now available in the `stored_credential` object under the `payment_source` which supports them (eg. `payment_source.card.stored_credential.payment_initiator`). Please specify this field in the `payment_source` object instead of the `application_context` object. <b>DEPRECATED</b><br><table><tr><th>See</th><th>Since Version</th></tr><tr><td>payment_source.card.stored_credential</td><td>2.9</td></tr></table>",
          "deprecated": true
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/activity_timestamps
{
  "title": "activity_timestamps",
  "description": "The date and time stamps that are common to authorized payment, captured payment, and refund transactions.",
  "type": "object",
  "properties": {
    "create_time": {
      "allOf": [
        {
          "$ref": "#/components/schemas/date_time"
        },
        {
          "description": "The date and time when the transaction occurred, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).",
          "readOnly": true
        }
      ]
    },
    "update_time": {
      "allOf": [
        {
          "$ref": "#/components/schemas/date_time"
        },
        {
          "description": "The date and time when the transaction was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).",
          "readOnly": true
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/payment_source_response
{
  "title": "payment_source_response",
  "description": "The payment source used to fund the payment.",
  "type": "object",
  "properties": {
    "card": {
      "$ref": "#/components/schemas/card_response"
    },
    "paypal": {
      "$ref": "#/components/schemas/paypal_wallet_response"
    },
    "bancontact": {
      "$ref": "#/components/schemas/bancontact"
    },
    "blik": {
      "$ref": "#/components/schemas/blik"
    },
    "eps": {
      "$ref": "#/components/schemas/eps"
    },
    "giropay": {
      "$ref": "#/components/schemas/giropay"
    },
    "ideal": {
      "$ref": "#/components/schemas/ideal"
    },
    "mybank": {
      "$ref": "#/components/schemas/mybank"
    },
    "p24": {
      "$ref": "#/components/schemas/p24"
    },
    "sofort": {
      "$ref": "#/components/schemas/sofort"
    },
    "trustly": {
      "$ref": "#/components/schemas/trustly"
    },
    "apple_pay": {
      "$ref": "#/components/schemas/apple_pay"
    },
    "google_pay": {
      "$ref": "#/components/schemas/google_pay"
    },
    "venmo": {
      "$ref": "#/components/schemas/venmo_wallet_response"
    },
    "crypto": {
      "$ref": "#/components/schemas/crypto"
    }
  }
}


## checkout_orders_v2.json #/components/schemas/purchase_unit
{
  "title": "Purchase Unit",
  "description": "The purchase unit details. Used to capture required information for the payment contract.",
  "type": "object",
  "properties": {
    "reference_id": {
      "description": "The API caller-provided external ID for the purchase unit. Required for multiple purchase units when you must update the order through `PATCH`. If you omit this value and the order contains only one purchase unit, PayPal sets this value to `default`. <blockquote><strong>Note:</strong> If there are multiple purchase units, <code>reference_id</code> is required for each purchase unit.</blockquote>",
      "type": "string",
      "minLength": 1,
      "maxLength": 256,
      "pattern": "^[\\S\\s]*$"
    },
    "amount": {
      "$ref": "#/components/schemas/amount_with_breakdown"
    },
    "payee": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payee"
        },
        {
          "description": "The merchant who receives payment for this transaction."
        }
      ]
    },
    "payment_instruction": {
      "$ref": "#/components/schemas/payment_instruction"
    },
    "description": {
      "description": "The purchase description.",
      "type": "string",
      "minLength": 1,
      "maxLength": 127,
      "pattern": "^[\\S\\s]*$"
    },
    "custom_id": {
      "description": "The API caller-provided external ID. Used to reconcile API caller-initiated transactions with PayPal transactions. Appears in transaction and settlement reports.",
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "pattern": "^[\\S\\s]*$"
    },
    "invoice_id": {
      "description": "The API caller-provided external invoice ID for this order.",
      "type": "string",
      "minLength": 1,
      "maxLength": 127,
      "pattern": "^[\\S\\s]*$"
    },
    "id": {
      "description": "The PayPal-generated ID for the purchase unit. This ID appears in both the payer's transaction history and the emails that the payer receives. In addition, this ID is available in transaction and settlement reports that merchants and API callers can use to reconcile transactions. This ID is only available when an order is saved by calling <code>v2/checkout/orders/id/save</code>.",
      "type": "string",
      "minLength": 1,
      "maxLength": 19,
      "pattern": "^[\\S\\s]*$"
    },
    "soft_descriptor": {
      "description": "The payment descriptor on account transactions on the customer's credit card statement, that PayPal sends to processors. The maximum length of the soft descriptor information that you can pass in the API field is 22 characters, in the following format:<code>22 - len(PAYPAL * (8)) - len(<var>Descriptor in Payment Receiving Preferences of Merchant account</var> + 1)</code>The PAYPAL prefix uses 8 characters.<br/><br/>The soft descriptor supports the following ASCII characters:<ul><li>Alphanumeric characters</li><li>Dashes</li><li>Asterisks</li><li>Periods (.)</li><li>Spaces</li></ul>For Wallet payments marketplace integrations:<ul><li>The merchant descriptor in the Payment Receiving Preferences must be the marketplace name.</li><li>You can't use the remaining space to show the customer service number.</li><li>The remaining spaces can be a combination of seller name and country.</li></ul><br/>For unbranded payments (Direct Card) marketplace integrations, use a combination of the seller name and phone number.",
      "type": "string",
      "minLength": 1,
      "maxLength": 22,
      "pattern": "^[\\S\\s]*$"
    },
    "items": {
      "description": "An array of items that the customer purchases from the merchant.",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/item"
          },
          {
            "title": "item",
            "description": "An item."
          }
        ]
      }
    },
    "shipping": {
      "allOf": [
        {
          "$ref": "#/components/schemas/shipping_with_tracking_details"
        },
        {
          "description": "The shipping address and method."
        }
      ]
    },
    "supplementary_data": {
      "allOf": [
        {
          "$ref": "#/components/schemas/supplementary_data"
        },
        {
          "description": "Supplementary data about this payment. Merchants and partners can add Level 2 and 3 data to payments to reduce risk and payment processing costs. For more information about processing payments, see <a href=\"https://developer.paypal.com/docs/checkout/advanced/processing/\">checkout</a> or <a href=\"https://developer.paypal.com/docs/multiparty/checkout/advanced/processing/\">multiparty checkout</a>."
        }
      ]
    },
    "payments": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payment_collection"
        },
        {
          "description": "The comprehensive history of payments for the purchase unit.",
          "readOnly": true
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/platform_fee
{
  "title": "platform_fee",
  "description": "The platform or partner fee, commission, or brokerage fee that is associated with the transaction. Not a separate or isolated transaction leg from the external perspective. The platform fee is limited in scope and is always associated with the original payment for the purchase unit.",
  "type": "object",
  "required": [
    "amount"
  ],
  "properties": {
    "amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "title": "amount",
          "description": "The fee for this transaction."
        }
      ]
    },
    "payee": {
      "allOf": [
        {
          "$ref": "#/components/schemas/payee_base"
        },
        {
          "title": "payee",
          "description": "The recipient of the fee for this transaction."
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/order_status
{
  "title": "Order Status",
  "description": "The order status.",
  "type": "string",
  "enum": [
    "CREATED",
    "SAVED",
    "APPROVED",
    "VOIDED",
    "COMPLETED",
    "PAYER_ACTION_REQUIRED"
  ]
}


## payments_payment_v2.json #/components/schemas/net_amount_breakdown_item
{
  "title": "net_amount_breakdown",
  "description": "The net amount. Returned when the currency of the refund is different from the currency of the PayPal account where the merchant holds their funds.",
  "type": "object",
  "properties": {
    "payable_amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The net amount debited from the merchant's PayPal account.",
          "readOnly": true
        }
      ]
    },
    "converted_amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The converted payable amount.",
          "readOnly": true
        }
      ]
    },
    "exchange_rate": {
      "allOf": [
        {
          "$ref": "#/components/schemas/exchange_rate"
        },
        {
          "description": "The exchange rate that determines the amount that was debited from the merchant's PayPal account.",
          "readOnly": true
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/link_description-2
{
  "title": "Link Description",
  "description": "The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.",
  "type": "object",
  "required": [
    "href",
    "rel"
  ],
  "properties": {
    "href": {
      "description": "The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "rel": {
      "description": "The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "method": {
      "description": "The HTTP method required to make the related call.",
      "type": "string",
      "enum": [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "HEAD",
        "CONNECT",
        "OPTIONS",
        "PATCH"
      ]
    },
    "title": {
      "description": "The link title.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "mediaType": {
      "title": "media_type",
      "description": "The media type, as defined by [RFC 2046](https://www.ietf.org/rfc/rfc2046.txt). Describes the link target.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "encType": {
      "title": "enc_type",
      "description": "The media type in which to submit the request data.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$",
      "default": "application/json"
    },
    "schema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema-2"
        },
        {
          "description": "The schema that describes the request data."
        }
      ]
    },
    "targetSchema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema-2"
        },
        {
          "title": "target_schema",
          "description": "The schema that describes the link target."
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/error_details
{
  "title": "Error Details",
  "description": "The error details. Required for client-side `4XX` errors.",
  "type": "object",
  "required": [
    "issue"
  ],
  "properties": {
    "field": {
      "description": "The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "value": {
      "description": "The value of the field that caused the error.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "location": {
      "description": "The location of the field that caused the error. Value is `body`, `path`, or `query`.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$",
      "default": "body"
    },
    "issue": {
      "description": "The unique, fine-grained application-level error code.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "links": {
      "description": "An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links) that are either relevant to the issue by providing additional information or offering potential resolutions.",
      "type": "array",
      "minItems": 1,
      "maxItems": 4,
      "readOnly": true,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/link_description"
          },
          {
            "title": "link_description",
            "readOnly": true
          }
        ]
      }
    },
    "description": {
      "description": "The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    }
  }
}


## checkout_orders_v2.json #/components/schemas/link_description
{
  "title": "Link Description",
  "description": "The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.",
  "type": "object",
  "required": [
    "href",
    "rel"
  ],
  "properties": {
    "href": {
      "description": "The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "rel": {
      "description": "The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "method": {
      "description": "The HTTP method required to make the related call.",
      "type": "string",
      "enum": [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "HEAD",
        "CONNECT",
        "OPTIONS",
        "PATCH"
      ]
    },
    "title": {
      "description": "The link title.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "mediaType": {
      "title": "media_type",
      "description": "The media type, as defined by [RFC 2046](https://www.ietf.org/rfc/rfc2046.txt). Describes the link target.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "encType": {
      "title": "enc_type",
      "description": "The media type in which to submit the request data.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$",
      "default": "application/json"
    },
    "schema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema"
        },
        {
          "description": "The schema that describes the request data."
        }
      ]
    },
    "targetSchema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema"
        },
        {
          "title": "target_schema",
          "description": "The schema that describes the link target."
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/link_description-2
{
  "title": "Link Description",
  "description": "The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.",
  "type": "object",
  "required": [
    "href",
    "rel"
  ],
  "properties": {
    "href": {
      "description": "The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "rel": {
      "description": "The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "method": {
      "description": "The HTTP method required to make the related call.",
      "type": "string",
      "enum": [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "HEAD",
        "CONNECT",
        "OPTIONS",
        "PATCH"
      ]
    },
    "title": {
      "description": "The link title.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "mediaType": {
      "title": "media_type",
      "description": "The media type, as defined by [RFC 2046](https://www.ietf.org/rfc/rfc2046.txt). Describes the link target.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "encType": {
      "title": "enc_type",
      "description": "The media type in which to submit the request data.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$",
      "default": "application/json"
    },
    "schema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema-2"
        },
        {
          "description": "The schema that describes the request data."
        }
      ]
    },
    "targetSchema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema-2"
        },
        {
          "title": "target_schema",
          "description": "The schema that describes the link target."
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/activity_timestamps
{
  "title": "activity_timestamps",
  "description": "The date and time stamps that are common to authorized payment, captured payment, and refund transactions.",
  "type": "object",
  "properties": {
    "create_time": {
      "allOf": [
        {
          "$ref": "#/components/schemas/date_time"
        },
        {
          "description": "The date and time when the transaction occurred, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).",
          "readOnly": true
        }
      ]
    },
    "update_time": {
      "allOf": [
        {
          "$ref": "#/components/schemas/date_time"
        },
        {
          "description": "The date and time when the transaction was last updated, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6).",
          "readOnly": true
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/error_details
{
  "title": "Error Details",
  "description": "The error details. Required for client-side `4XX` errors.",
  "type": "object",
  "required": [
    "issue"
  ],
  "properties": {
    "field": {
      "description": "The field that caused the error. If this field is in the body, set this value to the field's JSON pointer value. Required for client-side errors.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "value": {
      "description": "The value of the field that caused the error.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "location": {
      "description": "The location of the field that caused the error. Value is `body`, `path`, or `query`.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$",
      "default": "body"
    },
    "issue": {
      "description": "The unique, fine-grained application-level error code.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "links": {
      "description": "An array of request-related [HATEOAS links](/api/rest/responses/#hateoas-links) that are either relevant to the issue by providing additional information or offering potential resolutions.",
      "type": "array",
      "minItems": 1,
      "maxItems": 4,
      "readOnly": true,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/link_description"
          },
          {
            "title": "link_description",
            "readOnly": true
          }
        ]
      }
    },
    "description": {
      "description": "The human-readable description for an issue. The description can change over the lifetime of an API, so clients must not depend on this value.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    }
  }
}


## payments_payment_v2.json #/components/schemas/link_description
{
  "title": "Link Description",
  "description": "The request-related [HATEOAS link](/api/rest/responses/#hateoas-links) information.",
  "type": "object",
  "required": [
    "href",
    "rel"
  ],
  "properties": {
    "href": {
      "description": "The complete target URL. To make the related call, combine the method with this [URI Template-formatted](https://tools.ietf.org/html/rfc6570) link. For pre-processing, include the `$`, `(`, and `)` characters. The `href` is the key HATEOAS component that links a completed call with a subsequent call.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "rel": {
      "description": "The [link relation type](https://tools.ietf.org/html/rfc5988#section-4), which serves as an ID for a link that unambiguously describes the semantics of the link. See [Link Relations](https://www.iana.org/assignments/link-relations/link-relations.xhtml).",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "method": {
      "description": "The HTTP method required to make the related call.",
      "type": "string",
      "enum": [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "HEAD",
        "CONNECT",
        "OPTIONS",
        "PATCH"
      ]
    },
    "title": {
      "description": "The link title.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "mediaType": {
      "title": "media_type",
      "description": "The media type, as defined by [RFC 2046](https://www.ietf.org/rfc/rfc2046.txt). Describes the link target.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$"
    },
    "encType": {
      "title": "enc_type",
      "description": "The media type in which to submit the request data.",
      "type": "string",
      "minLength": 0,
      "maxLength": 2147483647,
      "pattern": "^[\\S\\s]*$",
      "default": "application/json"
    },
    "schema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema"
        },
        {
          "description": "The schema that describes the request data."
        }
      ]
    },
    "targetSchema": {
      "allOf": [
        {
          "$ref": "#/components/schemas/link_schema"
        },
        {
          "title": "target_schema",
          "description": "The schema that describes the link target."
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/date_time
{
  "description": "The date and time, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). Seconds are required while fractional seconds are optional.<blockquote><strong>Note:</strong> The regular expression provides guidance but does not reject all invalid dates.</blockquote>",
  "type": "string",
  "minLength": 20,
  "maxLength": 64,
  "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])[T,t]([0-1][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)([.][0-9]+)?([Zz]|[+-][0-9]{2}:[0-9]{2})$"
}


## checkout_orders_v2.json #/components/schemas/payer_base
{
  "title": "payer_base",
  "description": "The customer who approves and pays for the order. The customer is also known as the payer.",
  "type": "object",
  "properties": {
    "email_address": {
      "allOf": [
        {
          "$ref": "#/components/schemas/email"
        },
        {
          "description": "The email address of the payer."
        }
      ]
    },
    "payer_id": {
      "allOf": [
        {
          "$ref": "#/components/schemas/account_id"
        },
        {
          "description": "The PayPal-assigned ID for the payer.",
          "readOnly": true
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/name
{
  "title": "Name",
  "description": "The name of the party.",
  "type": "object",
  "properties": {
    "prefix": {
      "description": "The prefix, or title, to the party's name.",
      "type": "string",
      "minLength": 0,
      "maxLength": 140,
      "pattern": "^[\\S\\s]*$"
    },
    "given_name": {
      "description": "When the party is a person, the party's given, or first, name.",
      "type": "string",
      "minLength": 0,
      "maxLength": 140,
      "pattern": "^[\\S\\s]*$"
    },
    "surname": {
      "description": "When the party is a person, the party's surname or family name. Also known as the last name. Required when the party is a person. Use also to store multiple surnames including the matronymic, or mother's, surname.",
      "type": "string",
      "minLength": 0,
      "maxLength": 140,
      "pattern": "^[\\S\\s]*$"
    },
    "middle_name": {
      "description": "When the party is a person, the party's middle name. Use also to store multiple middle names including the patronymic, or father's, middle name.",
      "type": "string",
      "minLength": 0,
      "maxLength": 140,
      "pattern": "^[\\S\\s]*$"
    },
    "suffix": {
      "description": "The suffix for the party's name.",
      "type": "string",
      "minLength": 0,
      "maxLength": 140,
      "pattern": "^[\\S\\s]*$"
    },
    "full_name": {
      "description": "When the party is a person, the party's full name.",
      "type": "string",
      "minLength": 0,
      "maxLength": 300,
      "pattern": "^[\\S\\s]*$"
    }
  }
}


## checkout_orders_v2.json #/components/schemas/phone_with_type
{
  "title": "phone_with_type",
  "description": "The phone information.",
  "type": "object",
  "required": [
    "phone_number"
  ],
  "properties": {
    "phone_type": {
      "$ref": "#/components/schemas/phone_type"
    },
    "phone_number": {
      "allOf": [
        {
          "$ref": "#/components/schemas/phone_number_without_country_code"
        },
        {
          "description": "The phone number, in its canonical international [E.164 numbering plan format](https://www.itu.int/rec/T-REC-E.164/en). Supports only the `national_number` property."
        }
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/capture_status
{
  "title": "capture_status",
  "description": "The status and status details of a captured payment.",
  "type": "object",
  "properties": {
    "status": {
      "title": "Capture Status",
      "description": "The status of the captured payment.",
      "type": "string",
      "enum": [
        "COMPLETED",
        "DECLINED",
        "PARTIALLY_REFUNDED",
        "PENDING",
        "REFUNDED",
        "FAILED"
      ],
      "readOnly": true
    },
    "status_details": {
      "allOf": [
        {
          "$ref": "#/components/schemas/capture_status_details"
        },
        {
          "description": "The details of the captured payment status.",
          "readOnly": true
        }
      ]
    }
  }
}


## checkout_orders_v2.json #/components/schemas/date_no_time
{
  "description": "The stand-alone date, in [Internet date and time format](https://tools.ietf.org/html/rfc3339#section-5.6). To represent special legal values, such as a date of birth, you should use dates with no associated time or time-zone data. Whenever possible, use the standard `date_time` type. This regular expression does not validate all dates. For example, February 31 is valid and nothing is known about leap years.",
  "type": "string",
  "minLength": 10,
  "maxLength": 10,
  "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$"
}


## payments_payment_v2.json #/components/schemas/amount_with_breakdown
{
  "title": "amount_with_breakdown",
  "description": "The total order amount with an optional breakdown that provides details, such as the total item amount, total tax amount, shipping, handling, insurance, and discounts, if any.<br/>If you specify `amount.breakdown`, the amount equals `item_total` plus `tax_total` plus `shipping` plus `handling` plus `insurance` minus `shipping_discount` minus discount.<br/>The amount must be a positive number. For listed of supported currencies and decimal precision, see the PayPal REST APIs <a href=\"/docs/integration/direct/rest/currency-codes/\">Currency Codes</a>.",
  "type": "object",
  "allOf": [
    {
      "$ref": "#/components/schemas/money"
    },
    {
      "type": "object",
      "properties": {
        "breakdown": {
          "$ref": "#/components/schemas/amount_breakdown"
        }
      }
    }
  ]
}


## checkout_orders_v2.json #/components/schemas/tax_info
{
  "title": "tax_info",
  "description": "The tax ID of the customer. The customer is also known as the payer. Both `tax_id` and `tax_id_type` are required.",
  "type": "object",
  "required": [
    "tax_id",
    "tax_id_type"
  ],
  "properties": {
    "tax_id": {
      "description": "The customer's tax ID value.",
      "type": "string",
      "minLength": 1,
      "maxLength": 14,
      "pattern": "^.*([a-zA-Z0-9]).*$"
    },
    "tax_id_type": {
      "description": "The customer's tax ID type.",
      "type": "string",
      "enum": [
        "BR_CPF",
        "BR_CNPJ"
      ]
    }
  }
}


## payments_payment_v2.json #/components/schemas/network_transaction
{
  "title": "network_transaction",
  "description": "Reference values used by the card network to identify a transaction.",
  "type": "object",
  "properties": {
    "id": {
      "description": "Transaction reference id returned by the scheme. For Visa and Amex, this is the \"Tran id\" field in response. For MasterCard, this is the \"BankNet reference id\" field in response. For Discover, this is the \"NRID\" field in response. The pattern we expect for this field from Visa/Amex/CB/Discover is numeric, Mastercard/BNPP is alphanumeric and Paysecure is alphanumeric with special character -.",
      "type": "string",
      "minLength": 9,
      "maxLength": 36,
      "pattern": "^[a-zA-Z0-9-_@.:&+=*^'~#!$%()]+$"
    },
    "date": {
      "description": "The date that the transaction was authorized by the scheme. This field may not be returned for all networks. MasterCard refers to this field as \"BankNet reference date\". For some specific networks, such as MasterCard and Discover, this date field is mandatory when the `previous_network_transaction_reference_id` is passed.",
      "type": "string",
      "minLength": 4,
      "maxLength": 4,
      "pattern": "^[0-9]+$"
    },
    "network": {
      "allOf": [
        {
          "$ref": "#/components/schemas/card_brand"
        },
        {
          "description": "Name of the card network through which the transaction was routed."
        }
      ]
    },
    "acquirer_reference_number": {
      "description": "Reference ID issued for the card transaction. This ID can be used to track the transaction across processors, card brands and issuing banks.",
      "type": "string",
      "minLength": 1,
      "maxLength": 36,
      "pattern": "^[a-zA-Z0-9]+$"
    }
  }
}


## checkout_orders_v2.json #/components/schemas/address_portable
{
  "title": "Portable Postal Address (Medium-Grained)",
  "description": "The portable international postal address. Maps to [AddressValidationMetadata](https://github.com/googlei18n/libaddressinput/wiki/AddressValidationMetadata) and HTML 5.1 [Autofilling form controls: the autocomplete attribute](https://www.w3.org/TR/html51/sec-forms.html#autofilling-form-controls-the-autocomplete-attribute).",
  "type": "object",
  "required": [
    "country_code"
  ],
  "properties": {
    "address_line_1": {
      "description": "The first line of the address, such as number and street, for example, `173 Drury Lane`. Needed for data entry, and Compliance and Risk checks. This field needs to pass the full address.",
      "type": "string",
      "minLength": 0,
      "maxLength": 300,
      "pattern": "^[\\S\\s]*$"
    },
    "address_line_2": {
      "description": "The second line of the address, for example, a suite or apartment number.",
      "type": "string",
      "minLength": 0,
      "maxLength": 300,
      "pattern": "^[\\S\\s]*$"
    },
    "address_line_3": {
      "description": "The third line of the address, if needed. Examples include a street complement for Brazil, direction text, such as `next to Walmart`, or a landmark in an Indian address.",
      "type": "string",
      "minLength": 0,
      "maxLength": 100,
      "pattern": "^[\\S\\s]*$"
    },
    "admin_area_4": {
      "description": "The neighborhood, ward, or district. This is smaller than `admin_area_level_3` or `sub_locality`. Value is:<ul><li>The postal sorting code that is used in Guernsey and many French territories, such as French Guiana.</li><li>The fine-grained administrative levels in China.</li></ul>",
      "type": "string",
      "minLength": 0,
      "maxLength": 100,
      "pattern": "^[\\S\\s]*$"
    },
    "admin_area_3": {
      "description": "The sub-locality, suburb, neighborhood, or district. This is smaller than `admin_area_level_2`. Value is:<ul><li>Brazil. Suburb, *bairro*, or neighborhood.</li><li>India. Sub-locality or district. Street name information isn't always available, but a sub-locality or district can be a very small area.</li></ul>",
      "type": "string",
      "minLength": 0,
      "maxLength": 100,
      "pattern": "^[\\S\\s]*$"
    },
    "admin_area_2": {
      "description": "A city, town, or village. Smaller than `admin_area_level_1`.",
      "type": "string",
      "minLength": 0,
      "maxLength": 120,
      "pattern": "^[\\S\\s]*$"
    },
    "admin_area_1": {
      "description": "The highest-level sub-division in a country, which is usually a province, state, or ISO-3166-2 subdivision. This data is formatted for postal delivery, for example, `CA` and not `California`. Value, by country, is:<ul><li>UK. A county.</li><li>US. A state.</li><li>Canada. A province.</li><li>Japan. A prefecture.</li><li>Switzerland. A *kanton*.</li></ul>",
      "type": "string",
      "minLength": 0,
      "maxLength": 300,
      "pattern": "^[\\S\\s]*$"
    },
    "postal_code": {
      "description": "The postal code, which is the ZIP code or equivalent. Typically required for countries with a postal code or an equivalent. See [postal code](https://en.wikipedia.org/wiki/Postal_code).",
      "type": "string",
      "minLength": 0,
      "maxLength": 60,
      "pattern": "^[\\S\\s]*$"
    },
    "country_code": {
      "$ref": "#/components/schemas/country_code"
    },
    "address_details": {
      "title": "Address Details",
      "description": "The non-portable additional address details include fine-grain address information for Compliance, Risk, and other scenarios. This isn't portable with common third-party and open source applications. This can include data that is redundant with core fields. For example, `address_portable.address_line_1` is usually a combination of `address_details.street_number`, `street_name`, and `street_type`.",
      "type": "object",
      "properties": {
        "street_number": {
          "description": "The street number.",
          "type": "string",
          "minLength": 0,
          "maxLength": 100,
          "pattern": "^[\\S\\s]*$"
        },
        "street_name": {
          "description": "The street name. Just `Drury` in `Drury Lane`.",
          "type": "string",
          "minLength": 0,
          "maxLength": 100,
          "pattern": "^[\\S\\s]*$"
        },
        "street_type": {
          "description": "The street type. For example, avenue, boulevard, road, or expressway.",
          "type": "string",
          "minLength": 0,
          "maxLength": 100,
          "pattern": "^[\\S\\s]*$"
        },
        "delivery_service": {
          "description": "The delivery service. Post office box, bag number, or post office name.",
          "type": "string",
          "minLength": 0,
          "maxLength": 100,
          "pattern": "^[\\S\\s]*$"
        },
        "building_name": {
          "description": "A named locations that represents the premise. Usually a building name or number or collection of buildings with a common name or number. For example, <code>Craven House</code>.",
          "type": "string",
          "minLength": 0,
          "maxLength": 100,
          "pattern": "^[\\S\\s]*$"
        },
        "sub_building": {
          "description": "The first-order entity below a named building or location that represents the sub-premise. Usually a single building within a collection of buildings with a common name. Can be a flat, story, floor, room, or apartment.",
          "type": "string",
          "minLength": 0,
          "maxLength": 100,
          "pattern": "^[\\S\\s]*$"
        }
      }
    }
  }
}


## payments_payment_v2.json #/components/schemas/seller_protection
{
  "title": "seller_protection",
  "description": "The level of protection offered as defined by [PayPal Seller Protection for Merchants](https://www.paypal.com/us/webapps/mpp/security/seller-protection).",
  "type": "object",
  "properties": {
    "status": {
      "title": "Seller Protection Status",
      "description": "Indicates whether the transaction is eligible for seller protection. For information, see [PayPal Seller Protection for Merchants](https://www.paypal.com/us/webapps/mpp/security/seller-protection).",
      "type": "string",
      "enum": [
        "ELIGIBLE",
        "PARTIALLY_ELIGIBLE",
        "NOT_ELIGIBLE"
      ],
      "readOnly": true
    },
    "dispute_categories": {
      "description": "An array of conditions that are covered for the transaction.",
      "type": "array",
      "minItems": 0,
      "maxItems": 32767,
      "readOnly": true,
      "items": {
        "title": "dispute_category",
        "description": "The condition that is covered for the transaction.",
        "type": "string",
        "enum": [
          "ITEM_NOT_RECEIVED",
          "UNAUTHORIZED_TRANSACTION"
        ]
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/amount_with_breakdown
{
  "title": "amount_with_breakdown",
  "description": "The total order amount with an optional breakdown that provides details, such as the total item amount, total tax amount, shipping, handling, insurance, and discounts, if any.<br/>If you specify `amount.breakdown`, the amount equals `item_total` plus `tax_total` plus `shipping` plus `handling` plus `insurance` minus `shipping_discount` minus discount.<br/>The amount must be a positive number. For listed of supported currencies and decimal precision, see the PayPal REST APIs <a href=\"/docs/integration/direct/rest/currency-codes/\">Currency Codes</a>.",
  "type": "object",
  "allOf": [
    {
      "$ref": "#/components/schemas/money"
    },
    {
      "type": "object",
      "properties": {
        "breakdown": {
          "$ref": "#/components/schemas/amount_breakdown"
        }
      }
    }
  ]
}


## payments_payment_v2.json #/components/schemas/seller_receivable_breakdown
{
  "title": "Seller Receivable Breakdown",
  "description": "The detailed breakdown of the capture activity. This is not available for transactions that are in pending state.",
  "type": "object",
  "required": [
    "gross_amount"
  ],
  "properties": {
    "gross_amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The amount for this captured payment in the currency of the transaction."
        }
      ]
    },
    "paypal_fee": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The applicable fee for this captured payment in the currency of the transaction."
        }
      ]
    },
    "paypal_fee_in_receivable_currency": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The applicable fee for this captured payment in the receivable currency. Returned only in cases the fee is charged in the receivable currency. Example 'CNY'."
        }
      ]
    },
    "net_amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The net amount that the payee receives for this captured payment in their PayPal account. The net amount is computed as <code>gross_amount</code> minus the <code>paypal_fee</code> minus the <code>platform_fees</code>."
        }
      ]
    },
    "receivable_amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The net amount that is credited to the payee's PayPal account. Returned only when the currency of the captured payment is different from the currency of the PayPal account where the payee wants to credit the funds. The amount is computed as <code>net_amount</code> times <code>exchange_rate</code>."
        }
      ]
    },
    "exchange_rate": {
      "allOf": [
        {
          "$ref": "#/components/schemas/exchange_rate"
        },
        {
          "description": "The exchange rate that determines the amount that is credited to the payee's PayPal account. Returned when the currency of the captured payment is different from the currency of the PayPal account where the payee wants to credit the funds."
        }
      ]
    },
    "platform_fees": {
      "description": "An array of platform or partner fees, commissions, or brokerage fees that associated with the captured payment.",
      "type": "array",
      "minItems": 0,
      "maxItems": 1,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/platform_fee"
          },
          {
            "title": "platform_fee"
          }
        ]
      }
    }
  }
}


## checkout_orders_v2.json #/components/schemas/payee
{
  "title": "payee",
  "description": "The merchant who receives the funds and fulfills the order. The merchant is also known as the payee.",
  "type": "object",
  "allOf": [
    {
      "$ref": "#/components/schemas/payee_base"
    },
    {
      "type": "object"
    }
  ]
}


## payments_payment_v2.json #/components/schemas/disbursement_mode
{
  "title": "disbursement_mode",
  "description": "The funds that are held on behalf of the merchant.",
  "type": "string",
  "enum": [
    "INSTANT",
    "DELAYED"
  ],
  "default": "INSTANT"
}


## checkout_orders_v2.json #/components/schemas/payment_instruction
{
  "title": "payment_instruction",
  "description": "Any additional payment instructions to be consider during payment processing. This processing instruction is applicable for Capturing an order or Authorizing an Order.",
  "type": "object",
  "properties": {
    "platform_fees": {
      "description": "An array of various fees, commissions, tips, or donations. This field is only applicable to merchants that been enabled for PayPal Complete Payments Platform for Marketplaces and Platforms capability.",
      "type": "array",
      "minItems": 0,
      "maxItems": 1,
      "items": {
        "allOf": [
          {
            "$ref": "#/components/schemas/platform_fee"
          },
          {
            "title": "platform_fee"
          }
        ]
      }
    },
    "disbursement_mode": {
      "allOf": [
        {
          "$ref": "#/components/schemas/disbursement_mode"
        },
        {
          "description": "The funds that are held payee by the marketplace/platform. This field is only applicable to merchants that been enabled for PayPal Complete Payments Platform for Marketplaces and Platforms capability."
        }
      ]
    },
    "payee_pricing_tier_id": {
      "description": "This field is only enabled for selected merchants/partners to use and provides the ability to trigger a specific pricing rate/plan for a payment transaction. The list of eligible 'payee_pricing_tier_id' would be provided to you by your Account Manager. Specifying values other than the one provided to you by your account manager would result in an error.",
      "type": "string",
      "minLength": 1,
      "maxLength": 20,
      "pattern": "^.*$"
    },
    "payee_receivable_fx_rate_id": {
      "description": "FX identifier generated returned by PayPal to be used for payment processing in order to honor FX rate (for eligible integrations) to be used when amount is settled/received into the payee account.",
      "type": "string",
      "minLength": 1,
      "maxLength": 4000,
      "pattern": "^.*$"
    }
  }
}


## checkout_orders_v2.json #/components/schemas/item_request
{
  "title": "item_request",
  "description": "The details for the items to be purchased.",
  "type": "object",
  "required": [
    "name",
    "quantity",
    "unit_amount"
  ],
  "properties": {
    "name": {
      "description": "The item name or title. <blockquote>This field supports up to 3000 characters, but <strong>any content beyond 127 characters (including spaces) will be truncated. The 127 character limit is reflected in the response</strong> representation of this field</blockquote>.",
      "type": "string",
      "minLength": 1,
      "maxLength": 3000,
      "pattern": "^[\\S\\s]*$"
    },
    "unit_amount": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The item price or rate per unit. If you specify <code>unit_amount</code>, <code>purchase_units[].amount.breakdown.item_total</code> is required. Must equal <code>unit_amount * quantity</code> for all items. <code>unit_amount.value</code> can not be a negative number."
        }
      ]
    },
    "tax": {
      "allOf": [
        {
          "$ref": "#/components/schemas/money"
        },
        {
          "description": "The item tax for each unit. If <code>tax</code> is specified, <code>purchase_units[].amount.breakdown.tax_total</code> is required. Must equal <code>tax * quantity</code> for all items. <code>tax.value</code> can not be a negative number."
        }
      ]
    },
    "quantity": {
      "description": "The item quantity. Must be a whole number.",
      "type": "string",
      "minLength": 0,
      "maxLength": 10,
      "pattern": "^[1-9][0-9]{0,9}$"
    },
    "description": {
      "description": "<blockquote>This field supports up to 4000 characters, but <strong>any content beyond 2048 characters (including spaces) will be truncated. The 2048 character limit is reflected in the response</strong> representation of this field</blockquote>.",
      "type": "string",
      "minLength": 0,
      "maxLength": 4000,
      "pattern": "^[\\S\\s]*$"
    },
    "sku": {
      "description": "The stock keeping unit (SKU) for the item.",
      "type": "string",
      "minLength": 0,
      "maxLength": 127,
      "pattern": "^[\\S\\s]*$"
    },
    "url": {
      "description": "The URL to the item being purchased. Visible to buyer and used in buyer experiences.",
      "type": "string",
      "minLength": 1,
      "maxLength": 2048,
      "format": "uri"
    },
    "category": {
      "description": "The item category type.",
      "type": "string",
      "enum": [
        "DIGITAL_GOODS",
        "PHYSICAL_GOODS",
        "DONATION"
      ]
    },
    "image_url": {
      "description": "The URL of the item's image. File type and size restrictions apply. An image that violates these restrictions will not be honored.",
      "type": "string",
      "minLength": 1,
      "maxLength": 2048,
      "format": "uri"
    },
    "upc": {
      "allOf": [
        {
          "$ref": "#/components/schemas/universal_product_code"
        },
        {
          "description": "The Universal Product Code of the item."
        }
      ]
    },
    "billing_plan": {
      "$ref": "#/components/schemas/order_billing_plan"
    }
  }
}


## payments_payment_v2.json #/components/schemas/processor_response
{
  "title": "processor_response",
  "description": "The processor response information for payment requests, such as direct credit card transactions.",
  "type": "object",
  "properties": {
    "avs_code": {
      "description": "The address verification code for Visa, Discover, Mastercard, or American Express transactions.",
      "type": "string",
      "enum": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "I",
        "M",
        "N",
        "P",
        "R",
        "S",
        "U",
        "W",
        "X",
        "Y",
        "Z",
        "Null",
        "0",
        "1",
        "2",
        "3",
        "4"
      ],
      "readOnly": true
    },
    "cvv_code": {
      "description": "The card verification value code for for Visa, Discover, Mastercard, or American Express.",
      "type": "string",
      "enum": [
        "E",
        "I",
        "M",
        "N",
        "P",
        "S",
        "U",
        "X",
        "All others",
        "0",
        "1",
        "2",
        "3",
        "4"
      ],
      "readOnly": 