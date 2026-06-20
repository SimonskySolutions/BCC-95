/**
 * Offers facade — the single import surface for the inquiry → offer → decision
 * workflow. UI and other services should import from here rather than reaching
 * into individual service files, so the offering process stays cohesive.
 *
 *   import { computeOfferProgress, draftQuoteVersion, sendOffer } from '../services/offers'
 */

export { computeOfferProgress, canAdvanceTo, OFFER_STEP_ORDER } from './offerSubStateMachine.js'
export { startNewInquiry } from './newInquiryService.js'
export { registerInquiry, updateInquiry, closeInquiryRejected } from './inquiryIntakeService.js'
export { recordFeasibility } from './feasibilityService.js'
export { ensureQuoteForProduct, draftQuoteVersion, replaceLineItems } from './quoteVersioningService.js'
export { ensureCostSheet, draftVersionFromCostSheet, lineFromCatalog } from './costSheetService.js'
export { submitApproval } from './quoteApprovalService.js'
export { sendOffer, resolveAcceptanceBaseUrl } from './quoteSendService.js'
export { buildOfferEmailBody, buildOfferPlainText, buildOfferPdfBlob } from './offerDocumentService.js'
export { resolveAcceptanceToken, submitCustomerDecision } from './customerDecisionService.js'
export { convertAcceptedOfferToOrder } from './orderHandoffService.js'
