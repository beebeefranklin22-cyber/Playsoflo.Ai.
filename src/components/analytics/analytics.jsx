import { posthog } from './PostHogProvider';

export const trackEvent = (eventName, properties = {}) => {
  if (typeof window !== 'undefined' && posthog) {
    posthog.capture(eventName, properties);
  }
};

// Social Events
export const trackPostCreated = (postId, postType) => {
  trackEvent('post_created', { post_id: postId, post_type: postType });
};

export const trackPostLiked = (postId) => {
  trackEvent('post_liked', { post_id: postId });
};

export const trackPostCommented = (postId, commentId) => {
  trackEvent('post_commented', { post_id: postId, comment_id: commentId });
};

export const trackPostShared = (postId) => {
  trackEvent('post_shared', { post_id: postId });
};

// Follow Events
export const trackUserFollowed = (targetUserEmail) => {
  trackEvent('user_followed', { target_user: targetUserEmail });
};

export const trackUserUnfollowed = (targetUserEmail) => {
  trackEvent('user_unfollowed', { target_user: targetUserEmail });
};

// Message Events
export const trackMessageSent = (recipientEmail, conversationId) => {
  trackEvent('message_sent', { recipient: recipientEmail, conversation_id: conversationId });
};

export const trackConversationStarted = (participantEmails) => {
  trackEvent('conversation_started', { participants: participantEmails });
};

// Booking Events
export const trackBookingCreated = (bookingId, serviceType, amount) => {
  trackEvent('booking_created', { booking_id: bookingId, service_type: serviceType, amount });
};

export const trackBookingCompleted = (bookingId) => {
  trackEvent('booking_completed', { booking_id: bookingId });
};

// Payment Events
export const trackPaymentInitiated = (amount, paymentType) => {
  trackEvent('payment_initiated', { amount, payment_type: paymentType });
};

export const trackPaymentCompleted = (amount, paymentType, paymentId) => {
  trackEvent('payment_completed', { amount, payment_type: paymentType, payment_id: paymentId });
};

export const trackTipSent = (recipientEmail, amount) => {
  trackEvent('tip_sent', { recipient: recipientEmail, amount });
};

// Content Events
export const trackContentViewed = (contentId, contentType) => {
  trackEvent('content_viewed', { content_id: contentId, content_type: contentType });
};

export const trackStreamJoined = (streamId, creatorEmail) => {
  trackEvent('stream_joined', { stream_id: streamId, creator: creatorEmail });
};

// Product Events
export const trackProductViewed = (productId, productType) => {
  trackEvent('product_viewed', { product_id: productId, product_type: productType });
};

export const trackProductPurchased = (productId, amount) => {
  trackEvent('product_purchased', { product_id: productId, amount });
};

// Search Events
export const trackSearch = (query, resultsCount) => {
  trackEvent('search_performed', { query, results_count: resultsCount });
};

// Profile Events
export const trackProfileViewed = (profileEmail) => {
  trackEvent('profile_viewed', { profile_email: profileEmail });
};

export const trackProfileUpdated = () => {
  trackEvent('profile_updated');
};