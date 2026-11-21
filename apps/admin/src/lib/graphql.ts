import { gql, type TypedDocumentNode } from "@apollo/client";
import type { StoreLayout } from "@shopkit/themes";

export type ShopRole = "OWNER" | "ADMIN" | "STAFF";
export type ThemeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ThemeSource = "TEMPLATE" | "AI";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Shop {
  id: string;
  name: string;
  subdomain: string;
  currency: string;
  aiEnabled: boolean;
  aiCreditsBalance: number;
}

export interface Theme {
  id: string;
  name: string;
  source: ThemeSource;
  status: ThemeStatus;
  templateKey: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface ThemeTemplateInfo {
  key: string;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  headingFont: string;
  layout: string;
  layoutName: string;
  layoutDescription: string;
}

interface AuthPayload {
  accessToken: string;
  user: User;
}

const SHOP_FIELDS = gql`
  fragment ShopFields on Shop {
    id
    name
    subdomain
    currency
    aiEnabled
    aiCreditsBalance
  }
`;

const THEME_FIELDS = gql`
  fragment ThemeFields on Theme {
    id
    name
    source
    status
    templateKey
    publishedAt
    createdAt
  }
`;

export const SIGNUP: TypedDocumentNode<
  { signup: AuthPayload },
  { input: { name: string; email: string; password: string } }
> = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      accessToken
      user {
        id
        name
        email
      }
    }
  }
`;

export const LOGIN: TypedDocumentNode<{ login: AuthPayload }, { input: { email: string; password: string } }> = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        name
        email
      }
    }
  }
`;

export const MY_SHOPS: TypedDocumentNode<{ myShops: { role: ShopRole; shop: Shop }[] }> = gql`
  ${SHOP_FIELDS}
  query MyShops {
    myShops {
      role
      shop {
        ...ShopFields
      }
    }
  }
`;

export const SUBDOMAIN_AVAILABILITY: TypedDocumentNode<
  { subdomainAvailability: { available: boolean; reason: string | null } },
  { subdomain: string }
> = gql`
  query SubdomainAvailability($subdomain: String!) {
    subdomainAvailability(subdomain: $subdomain) {
      available
      reason
    }
  }
`;

export const CREATE_SHOP: TypedDocumentNode<
  { createShop: Shop },
  { input: { name: string; subdomain: string } }
> = gql`
  ${SHOP_FIELDS}
  mutation CreateShop($input: CreateShopInput!) {
    createShop(input: $input) {
      ...ShopFields
    }
  }
`;

export const CURRENT_SHOP: TypedDocumentNode<{ currentShop: Shop }> = gql`
  ${SHOP_FIELDS}
  query CurrentShop {
    currentShop {
      ...ShopFields
    }
  }
`;

export const THEME_TEMPLATES: TypedDocumentNode<{
  themeTemplates: ThemeTemplateInfo[];
  aiStoreGenerationCost: number;
}> = gql`
  query ThemeTemplates {
    aiStoreGenerationCost
    themeTemplates {
      key
      name
      description
      primaryColor
      accentColor
      backgroundColor
      headingFont
      layout
      layoutName
      layoutDescription
    }
  }
`;

export const THEMES: TypedDocumentNode<{ themes: Theme[] }> = gql`
  ${THEME_FIELDS}
  query Themes {
    themes {
      ...ThemeFields
    }
  }
`;

export const CREATE_THEME_FROM_TEMPLATE: TypedDocumentNode<
  { createThemeFromTemplate: Theme },
  { input: { templateKey: string } }
> = gql`
  ${THEME_FIELDS}
  mutation CreateThemeFromTemplate($input: CreateThemeFromTemplateInput!) {
    createThemeFromTemplate(input: $input) {
      ...ThemeFields
    }
  }
`;

export const GENERATE_THEME_WITH_AI: TypedDocumentNode<
  { generateThemeWithAi: Theme },
  { input: { description: string } }
> = gql`
  ${THEME_FIELDS}
  mutation GenerateThemeWithAi($input: GenerateThemeInput!) {
    generateThemeWithAi(input: $input) {
      ...ThemeFields
    }
  }
`;

export const PUBLISH_THEME: TypedDocumentNode<{ publishTheme: Theme }, { input: { themeId: string } }> = gql`
  ${THEME_FIELDS}
  mutation PublishTheme($input: ThemeIdInput!) {
    publishTheme(input: $input) {
      ...ThemeFields
    }
  }
`;

export const THEME: TypedDocumentNode<{ theme: Theme & { layout: StoreLayout } }, { id: string }> = gql`
  ${THEME_FIELDS}
  query Theme($id: ID!) {
    theme(id: $id) {
      ...ThemeFields
      layout
    }
  }
`;

export const UPDATE_THEME: TypedDocumentNode<
  { updateTheme: Theme & { layout: StoreLayout } },
  { input: { themeId: string; name?: string; layout: StoreLayout } }
> = gql`
  ${THEME_FIELDS}
  mutation UpdateTheme($input: UpdateThemeInput!) {
    updateTheme(input: $input) {
      ...ThemeFields
      layout
    }
  }
`;

export const DELETE_THEME: TypedDocumentNode<{ deleteTheme: boolean }, { input: { themeId: string } }> = gql`
  mutation DeleteTheme($input: ThemeIdInput!) {
    deleteTheme(input: $input)
  }
`;

// ---- Catalog ----

export type ProductStatus = "ACTIVE" | "DRAFT";

export interface Collection {
  id: string;
  name: string;
  handle: string;
  description: string;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  optionValues: string[];
  title: string;
  /** In paise. */
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  sku: string | null;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  /** Lowest variant price, in paise. */
  price: number;
  compareAtPrice: number | null;
  /** Sum across variants; null if any variant is not tracked. */
  stock: number | null;
  images: string[];
  status: ProductStatus;
  collectionId: string | null;
  collection: Pick<Collection, "id" | "name"> | null;
  options: ProductOption[];
  variants: ProductVariant[];
  gstRate: number | null;
  hsnCode: string | null;
  createdAt: string;
}

export interface ProductVariantInput {
  optionValues: string[];
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  sku: string | null;
}

export interface ProductInput {
  title: string;
  description: string;
  /** Required for products without options. */
  price?: number | null;
  compareAtPrice?: number | null;
  stock?: number | null;
  options?: ProductOption[];
  variants?: ProductVariantInput[];
  images: string[];
  status: ProductStatus;
  collectionId: string | null;
  gstRate?: number | null;
  hsnCode?: string | null;
}

const COLLECTION_FIELDS = gql`
  fragment CollectionFields on Collection {
    id
    name
    handle
    description
  }
`;

const PRODUCT_FIELDS = gql`
  fragment ProductFields on Product {
    id
    title
    handle
    description
    price
    compareAtPrice
    stock
    images
    status
    collectionId
    collection {
      id
      name
    }
    options {
      name
      values
    }
    variants {
      id
      optionValues
      title
      price
      compareAtPrice
      stock
      sku
    }
    gstRate
    hsnCode
    createdAt
  }
`;

export const COLLECTIONS: TypedDocumentNode<{ collections: Collection[] }> = gql`
  ${COLLECTION_FIELDS}
  query Collections {
    collections {
      ...CollectionFields
    }
  }
`;

export const CREATE_COLLECTION: TypedDocumentNode<
  { createCollection: Collection },
  { input: { name: string; description: string } }
> = gql`
  ${COLLECTION_FIELDS}
  mutation CreateCollection($input: CollectionInput!) {
    createCollection(input: $input) {
      ...CollectionFields
    }
  }
`;

export const UPDATE_COLLECTION: TypedDocumentNode<
  { updateCollection: Collection },
  { id: string; input: { name: string; description: string } }
> = gql`
  ${COLLECTION_FIELDS}
  mutation UpdateCollection($id: ID!, $input: CollectionInput!) {
    updateCollection(id: $id, input: $input) {
      ...CollectionFields
    }
  }
`;

export const DELETE_COLLECTION: TypedDocumentNode<{ deleteCollection: boolean }, { id: string }> = gql`
  mutation DeleteCollection($id: ID!) {
    deleteCollection(id: $id)
  }
`;

export const PRODUCTS: TypedDocumentNode<
  { products: Product[] },
  { filter?: { search?: string; status?: ProductStatus; collectionId?: string } }
> = gql`
  ${PRODUCT_FIELDS}
  query Products($filter: ProductFilter) {
    products(filter: $filter) {
      ...ProductFields
    }
  }
`;

export const PRODUCT: TypedDocumentNode<{ product: Product }, { id: string }> = gql`
  ${PRODUCT_FIELDS}
  query Product($id: ID!) {
    product(id: $id) {
      ...ProductFields
    }
  }
`;

export const CREATE_PRODUCT: TypedDocumentNode<{ createProduct: Product }, { input: ProductInput }> = gql`
  ${PRODUCT_FIELDS}
  mutation CreateProduct($input: ProductInput!) {
    createProduct(input: $input) {
      ...ProductFields
    }
  }
`;

export const UPDATE_PRODUCT: TypedDocumentNode<{ updateProduct: Product }, { id: string; input: ProductInput }> = gql`
  ${PRODUCT_FIELDS}
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    updateProduct(id: $id, input: $input) {
      ...ProductFields
    }
  }
`;

export const DELETE_PRODUCT: TypedDocumentNode<{ deleteProduct: boolean }, { id: string }> = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

export const AI_PRODUCT_LISTING_COST: TypedDocumentNode<{ aiProductListingCost: number }> = gql`
  query AiProductListingCost {
    aiProductListingCost
  }
`;

export const GENERATE_PRODUCT_LISTING: TypedDocumentNode<
  { generateProductListing: { title: string; description: string; collectionId: string | null } },
  { input: { imageUrl: string; hint: string } }
> = gql`
  mutation GenerateProductListing($input: GenerateListingInput!) {
    generateProductListing(input: $input) {
      title
      description
      collectionId
    }
  }
`;

export const CREATE_THEME_PREVIEW: TypedDocumentNode<
  { createThemePreview: { token: string; draftId: string | null; expiresAt: string } },
  { input: { themeId: string; withDraft?: boolean } }
> = gql`
  mutation CreateThemePreview($input: CreateThemePreviewInput!) {
    createThemePreview(input: $input) {
      token
      draftId
      expiresAt
    }
  }
`;

export const SET_THEME_PREVIEW_DRAFT: TypedDocumentNode<
  { setThemePreviewDraft: boolean },
  { input: { themeId: string; draftId: string; layout: StoreLayout } }
> = gql`
  mutation SetThemePreviewDraft($input: ThemePreviewDraftInput!) {
    setThemePreviewDraft(input: $input)
  }
`;
// ---- Settings ----

export type ShopPlan = "FREE" | "STARTER" | "GROWTH";

export interface ShopSettings {
  name: string;
  subdomain: string;
  storeUrl: string;
  contactEmail: string | null;
  aiEnabled: boolean;
  codEnabled: boolean;
  shippingFee: number;
  freeShippingAbove: number | null;
  razorpayKeyId: string | null;
  razorpayConfigured: boolean;
  razorpayWebhookConfigured: boolean;
  razorpayWebhookUrl: string;
  paymentsTestMode: boolean;
  testPaymentsAllowed: boolean;
  legalName: string | null;
  gstin: string | null;
  businessAddress: string | null;
  stateCode: string | null;
  defaultGstRate: number;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainAllowed: boolean;
  domainDns: { cnameName: string; cnameTarget: string; txtName: string; txtValue: string } | null;
  plan: ShopPlan;
}

const SETTINGS_FIELDS = gql`
  fragment SettingsFields on ShopSettings {
    name
    subdomain
    storeUrl
    contactEmail
    aiEnabled
    codEnabled
    shippingFee
    freeShippingAbove
    razorpayKeyId
    razorpayConfigured
    razorpayWebhookConfigured
    razorpayWebhookUrl
    paymentsTestMode
    testPaymentsAllowed
    legalName
    gstin
    businessAddress
    stateCode
    defaultGstRate
    customDomain
    customDomainVerified
    customDomainAllowed
    domainDns {
      cnameName
      cnameTarget
      txtName
      txtValue
    }
    plan
  }
`;

export const SHOP_SETTINGS: TypedDocumentNode<{ shopSettings: ShopSettings }> = gql`
  ${SETTINGS_FIELDS}
  query ShopSettings {
    shopSettings {
      ...SettingsFields
    }
  }
`;

export const UPDATE_STORE_SETTINGS: TypedDocumentNode<
  { updateStoreSettings: ShopSettings },
  { input: { name: string; contactEmail: string | null; aiEnabled: boolean } }
> = gql`
  ${SETTINGS_FIELDS}
  mutation UpdateStoreSettings($input: StoreSettingsInput!) {
    updateStoreSettings(input: $input) {
      ...SettingsFields
    }
  }
`;

export const UPDATE_CHECKOUT_SETTINGS: TypedDocumentNode<
  { updateCheckoutSettings: ShopSettings },
  { input: { codEnabled: boolean; shippingFee: number; freeShippingAbove: number | null } }
> = gql`
  ${SETTINGS_FIELDS}
  mutation UpdateCheckoutSettings($input: CheckoutSettingsInput!) {
    updateCheckoutSettings(input: $input) {
      ...SettingsFields
    }
  }
`;

export const UPDATE_PAYMENT_SETTINGS: TypedDocumentNode<
  { updatePaymentSettings: ShopSettings },
  {
    input: {
      razorpayKeyId: string | null;
      razorpayKeySecret: string | null;
      razorpayWebhookSecret: string | null;
      paymentsTestMode: boolean;
    };
  }
> = gql`
  ${SETTINGS_FIELDS}
  mutation UpdatePaymentSettings($input: PaymentSettingsInput!) {
    updatePaymentSettings(input: $input) {
      ...SettingsFields
    }
  }
`;

export const UPDATE_BUSINESS_SETTINGS: TypedDocumentNode<
  { updateBusinessSettings: ShopSettings },
  {
    input: {
      legalName: string | null;
      gstin: string | null;
      businessAddress: string | null;
      stateCode: string | null;
      defaultGstRate: number;
    };
  }
> = gql`
  ${SETTINGS_FIELDS}
  mutation UpdateBusinessSettings($input: BusinessSettingsInput!) {
    updateBusinessSettings(input: $input) {
      ...SettingsFields
    }
  }
`;

export const SET_CUSTOM_DOMAIN: TypedDocumentNode<{ setCustomDomain: ShopSettings }, { input: { domain: string } }> = gql`
  ${SETTINGS_FIELDS}
  mutation SetCustomDomain($input: CustomDomainInput!) {
    setCustomDomain(input: $input) {
      ...SettingsFields
    }
  }
`;

export const VERIFY_CUSTOM_DOMAIN: TypedDocumentNode<{ verifyCustomDomain: ShopSettings }> = gql`
  ${SETTINGS_FIELDS}
  mutation VerifyCustomDomain {
    verifyCustomDomain {
      ...SettingsFields
    }
  }
`;

export const REMOVE_CUSTOM_DOMAIN: TypedDocumentNode<{ removeCustomDomain: ShopSettings }> = gql`
  ${SETTINGS_FIELDS}
  mutation RemoveCustomDomain {
    removeCustomDomain {
      ...SettingsFields
    }
  }
`;

// ---- Orders ----

export type OrderStatus = "PENDING_PAYMENT" | "PLACED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentMethod = "COD" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderSummary {
  id: string;
  number: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  customer: { name: string; phone: string };
  items: { quantity: number }[];
}

export interface Order extends OrderSummary {
  customer: { name: string; phone: string; email: string | null };
  shippingAddress: { line1: string; line2: string; city: string; state: string; stateCode: string; pincode: string };
  items: {
    productId: string | null;
    title: string;
    variantTitle: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  subtotal: number;
  shippingFee: number;
  tax: { taxable: number; cgst: number; sgst: number; igst: number } | null;
  invoiceNumber: string | null;
  note: string | null;
  accessToken: string;
  gatewayPaymentId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

const ORDER_SUMMARY_FIELDS = gql`
  fragment OrderSummaryFields on Order {
    id
    number
    status
    paymentMethod
    paymentStatus
    total
    createdAt
    customer {
      name
      phone
    }
    items {
      quantity
    }
  }
`;

const ORDER_FIELDS = gql`
  fragment OrderFields on Order {
    id
    number
    status
    paymentMethod
    paymentStatus
    total
    createdAt
    customer {
      name
      phone
      email
    }
    shippingAddress {
      line1
      line2
      city
      state
      stateCode
      pincode
    }
    items {
      productId
      title
      variantTitle
      image
      unitPrice
      quantity
      lineTotal
    }
    subtotal
    shippingFee
    tax {
      taxable
      cgst
      sgst
      igst
    }
    invoiceNumber
    note
    accessToken
    gatewayPaymentId
    trackingNumber
    trackingUrl
    expiresAt
    paidAt
    shippedAt
    deliveredAt
    cancelledAt
  }
`;

export const ORDERS: TypedDocumentNode<
  { orders: OrderSummary[] },
  { filter?: { status?: OrderStatus; search?: string } }
> = gql`
  ${ORDER_SUMMARY_FIELDS}
  query Orders($filter: OrderFilter) {
    orders(filter: $filter) {
      ...OrderSummaryFields
    }
  }
`;

export const ORDER: TypedDocumentNode<{ order: Order }, { id: string }> = gql`
  ${ORDER_FIELDS}
  query Order($id: ID!) {
    order(id: $id) {
      ...OrderFields
    }
  }
`;

export const ORDER_COUNTS: TypedDocumentNode<{ orderCounts: { toShip: number; shipped: number; total: number } }> = gql`
  query OrderCounts {
    orderCounts {
      toShip
      shipped
      total
    }
  }
`;

export const MARK_ORDER_SHIPPED: TypedDocumentNode<
  { markOrderShipped: Order },
  { input: { orderId: string; trackingNumber: string | null; trackingUrl: string | null } }
> = gql`
  ${ORDER_FIELDS}
  mutation MarkOrderShipped($input: ShipOrderInput!) {
    markOrderShipped(input: $input) {
      ...OrderFields
    }
  }
`;

export const MARK_ORDER_DELIVERED: TypedDocumentNode<{ markOrderDelivered: Order }, { id: string }> = gql`
  ${ORDER_FIELDS}
  mutation MarkOrderDelivered($id: ID!) {
    markOrderDelivered(id: $id) {
      ...OrderFields
    }
  }
`;

export const CANCEL_ORDER: TypedDocumentNode<{ cancelOrder: Order }, { id: string }> = gql`
  ${ORDER_FIELDS}
  mutation CancelOrder($id: ID!) {
    cancelOrder(id: $id) {
      ...OrderFields
    }
  }
`;

// ---- Billing ----

export interface PlanInfo {
  plan: ShopPlan;
  name: string;
  price: number;
  maxProducts: number;
  customDomain: boolean;
  aiCredits: number;
}

export interface BillingOverview {
  plan: PlanInfo;
  planExpiresAt: string | null;
  aiCreditsBalance: number;
  productCount: number;
  plans: PlanInfo[];
  creditPacks: { key: string; credits: number; price: number }[];
  payments: {
    id: string;
    kind: "PLAN" | "AI_CREDITS";
    plan: ShopPlan | null;
    credits: number;
    amount: number;
    status: "CREATED" | "PAID" | "FAILED";
    paidAt: string | null;
    createdAt: string;
  }[];
}

export interface BillingCheckout {
  billingPaymentId: string;
  gateway: string;
  keyId: string | null;
  gatewayOrderId: string;
  amount: number;
  description: string;
}

const PLAN_FIELDS = gql`
  fragment PlanFields on PlanInfo {
    plan
    name
    price
    maxProducts
    customDomain
    aiCredits
  }
`;

const BILLING_FIELDS = gql`
  ${PLAN_FIELDS}
  fragment BillingFields on BillingOverview {
    plan {
      ...PlanFields
    }
    planExpiresAt
    aiCreditsBalance
    productCount
    plans {
      ...PlanFields
    }
    creditPacks {
      key
      credits
      price
    }
    payments {
      id
      kind
      plan
      credits
      amount
      status
      paidAt
      createdAt
    }
  }
`;

const CHECKOUT_FIELDS = gql`
  fragment BillingCheckoutFields on BillingCheckout {
    billingPaymentId
    gateway
    keyId
    gatewayOrderId
    amount
    description
  }
`;

export const BILLING_OVERVIEW: TypedDocumentNode<{ billingOverview: BillingOverview }> = gql`
  ${BILLING_FIELDS}
  query BillingOverview {
    billingOverview {
      ...BillingFields
    }
  }
`;

export const BUY_PLAN: TypedDocumentNode<{ buyPlan: BillingCheckout }, { input: { plan: ShopPlan } }> = gql`
  ${CHECKOUT_FIELDS}
  mutation BuyPlan($input: BuyPlanInput!) {
    buyPlan(input: $input) {
      ...BillingCheckoutFields
    }
  }
`;

export const BUY_AI_CREDITS: TypedDocumentNode<{ buyAiCredits: BillingCheckout }, { input: { packKey: string } }> = gql`
  ${CHECKOUT_FIELDS}
  mutation BuyAiCredits($input: BuyCreditsInput!) {
    buyAiCredits(input: $input) {
      ...BillingCheckoutFields
    }
  }
`;

export const CONFIRM_BILLING_PAYMENT: TypedDocumentNode<
  { confirmBillingPayment: BillingOverview },
  { input: { billingPaymentId: string; paymentId: string; signature: string } }
> = gql`
  ${BILLING_FIELDS}
  mutation ConfirmBillingPayment($input: ConfirmBillingPaymentInput!) {
    confirmBillingPayment(input: $input) {
      ...BillingFields
    }
  }
`;

export const SIMULATE_BILLING_PAYMENT: TypedDocumentNode<
  { simulateBillingPayment: { paymentId: string; signature: string } },
  { input: { billingPaymentId: string } }
> = gql`
  mutation SimulateBillingPayment($input: BillingPaymentIdInput!) {
    simulateBillingPayment(input: $input) {
      paymentId
      signature
    }
  }
`;
