<?php

namespace Dawnsol\Quotemate\Services;

use Dawnsol\Quotemate\Traits\Singleton;

defined('ABSPATH') || exit;

/**
 * Email Service Class
 * 
 * Handles all email-related functionality for QuoteMate
 * 
 * @since 1.0.0
 */
class EmailService
{
    use Singleton;

    /**
     * Send admin notification email
     */
    public function send_admin_notification($form, $submitted_data, $user_email = '')
    {
        $admin_email = get_option('admin_email');
        $subject = sprintf(
            __('New Quote Request from %s', 'quotemate'),
            get_bloginfo('name')
        );
        
        $message = $this->build_admin_message($form, $submitted_data, $user_email);
        
        $headers = ['Content-Type: text/html; charset=UTF-8'];
        
        return wp_mail($admin_email, $subject, $message, $headers);
    }

    /**
     * Send customer confirmation email
     */
    public function send_customer_confirmation($form, $submitted_data, $user_email)
    {
        if (empty($user_email)) {
            return false;
        }

        $subject = sprintf(
            __('Quote Request Confirmation - %s', 'quotemate'),
            get_bloginfo('name')
        );
        
        $message = $this->build_customer_message($form, $submitted_data);
        
        $headers = ['Content-Type: text/html; charset=UTF-8'];
        
        return wp_mail($user_email, $subject, $message, $headers);
    }

    /**
     * Build admin notification message
     */
    private function build_admin_message($form, $submitted_data, $user_email)
    {
        $message = '<html><body>';
        $message .= '<h2>' . __('New Quote Request Received', 'quotemate') . '</h2>';
        $message .= '<p><strong>' . __('Form:', 'quotemate') . '</strong> ' . esc_html($form->name) . '</p>';
        
        if (!empty($user_email)) {
            $message .= '<p><strong>' . __('Customer Email:', 'quotemate') . '</strong> ' . esc_html($user_email) . '</p>';
        }
        
        $message .= '<h3>' . __('Submitted Information:', 'quotemate') . '</h3>';
        $message .= '<table style="border-collapse: collapse; width: 100%;">';
        $message .= '<tr style="background-color: #f5f5f5;"><th style="border: 1px solid #ddd; padding: 8px;">' . __('Field', 'quotemate') . '</th><th style="border: 1px solid #ddd; padding: 8px;">' . __('Value', 'quotemate') . '</th></tr>';
        
        foreach ($submitted_data as $field_id => $field_data) {
            if (!empty($field_data['value'])) {
                $message .= '<tr>';
                $message .= '<td style="border: 1px solid #ddd; padding: 8px;"><strong>' . esc_html($field_data['label']) . '</strong></td>';
                $message .= '<td style="border: 1px solid #ddd; padding: 8px;">' . esc_html($field_data['value']) . '</td>';
                $message .= '</tr>';
            }
        }
        
        $message .= '</table>';
        $message .= '<p><em>' . __('This email was sent automatically by QuoteMate plugin.', 'quotemate') . '</em></p>';
        $message .= '</body></html>';
        
        return $message;
    }

    /**
     * Build customer confirmation message
     */
    private function build_customer_message($form, $submitted_data)
    {
        $message = '<html><body>';
        $message .= '<h2>' . __('Thank You for Your Quote Request', 'quotemate') . '</h2>';
        $message .= '<p>' . __('We have received your quote request and will get back to you soon.', 'quotemate') . '</p>';
        
        $message .= '<h3>' . __('Your Submitted Information:', 'quotemate') . '</h3>';
        $message .= '<table style="border-collapse: collapse; width: 100%;">';
        $message .= '<tr style="background-color: #f5f5f5;"><th style="border: 1px solid #ddd; padding: 8px;">' . __('Field', 'quotemate') . '</th><th style="border: 1px solid #ddd; padding: 8px;">' . __('Value', 'quotemate') . '</th></tr>';
        
        foreach ($submitted_data as $field_id => $field_data) {
            if (!empty($field_data['value'])) {
                $message .= '<tr>';
                $message .= '<td style="border: 1px solid #ddd; padding: 8px;"><strong>' . esc_html($field_data['label']) . '</strong></td>';
                $message .= '<td style="border: 1px solid #ddd; padding: 8px;">' . esc_html($field_data['value']) . '</td>';
                $message .= '</tr>';
            }
        }
        
        $message .= '</table>';
        $message .= '<p><em>' . __('This is an automated confirmation email from QuoteMate plugin.', 'quotemate') . '</em></p>';
        $message .= '</body></html>';
        
        return $message;
    }

    /**
     * Test email functionality
     */
    public function test_email($to_email)
    {
        $subject = __('QuoteMate Email Test', 'quotemate');
        $message = '<html><body>';
        $message .= '<h2>' . __('QuoteMate Email Test', 'quotemate') . '</h2>';
        $message .= '<p>' . __('This is a test email to verify that QuoteMate email functionality is working correctly.', 'quotemate') . '</p>';
        $message .= '<p><strong>' . __('Time:', 'quotemate') . '</strong> ' . current_time('Y-m-d H:i:s') . '</p>';
        $message .= '</body></html>';
        
        $headers = ['Content-Type: text/html; charset=UTF-8'];
        
        return wp_mail($to_email, $subject, $message, $headers);
    }
} 