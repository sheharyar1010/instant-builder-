<?php

namespace Dawnsol\Quotemate\Admin\Includes\Tables;

use Dawnsol\Quotemate\Admin\Models\Submission;
use Dawnsol\Quotemate\Helpers\SanitizationHelper;
use Dawnsol\Quotemate\Helpers\DateHelper;

defined('ABSPATH') || exit;

if (!class_exists('WP_List_Table')) {
    require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

class SubmissionsListTable extends \WP_List_Table
{
    private $form_id;

    public function __construct($form_id)
    {
        parent::__construct([
            'singular' => 'submission',
            'plural'   => 'submissions',
            'ajax'     => false,
        ]);

        $this->form_id = $form_id;
    }

    public function get_columns()
    {
        return [
            'cb'           => '<input type="checkbox" />',
            'id'           => 'ID',
            'email'        => 'Email',
            'price'        => 'Price',
            'status'       => 'Status',
            'created_at'   => 'Date Submitted',
        ];
    }

    public function get_sortable_columns()
    {
        return [
            'id'         => ['id', false],
            'email'      => ['user_email', false],
            'price'      => ['price', false],
            'status'     => ['viewed', false],
            'created_at' => ['created_at', true],
        ];
    }

    public function get_bulk_actions()
    {
        return [
            'delete' => 'Delete',
            'mark_viewed' => 'Mark as Viewed',
        ];
    }

    /**
     * Handle single and bulk actions
     */
    public function process_actions()
    {
        $action = $this->current_action();

        if (!$action) {
            return;
        }

        // Handle single delete action
        if ($action === 'delete' && isset($_GET['submission_id'])) {
            $submission_id = (int) $_GET['submission_id'];

            // Verify nonce for single delete
            if (!isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], 'delete_submission_' . $submission_id)) {
                wp_die(__('Security check failed. Please try again.', 'quotemate'));
            }

            $result = Submission::delete($submission_id);

            // Redirect with success/error message
            $redirect_url = remove_query_arg(['action', 'submission_id', '_wpnonce']);
            $redirect_url = add_query_arg([
                'deleted' => $result ? '1' : '0',
                'count' => 1
            ], $redirect_url);

            wp_redirect($redirect_url);
            exit;
        }

        // Handle bulk actions
        if (isset($_POST['submission']) && is_array($_POST['submission'])) {
            // Verify nonce for bulk actions
            if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'bulk-submissions')) {
                wp_die(__('Security check failed. Please try again.', 'quotemate'));
            }

            $submission_ids = array_map('intval', $_POST['submission']);
            $success_count = 0;
            $total_count = count($submission_ids);

            switch ($action) {
                case 'delete':
                    foreach ($submission_ids as $submission_id) {
                        if (Submission::delete($submission_id)) {
                            $success_count++;
                        }
                    }
                    $redirect_url = add_query_arg([
                        'bulk_deleted' => '1',
                        'count' => $success_count,
                        'total' => $total_count
                    ], remove_query_arg(['action', 'submission']));
                    break;

                case 'mark_viewed':
                    foreach ($submission_ids as $submission_id) {
                        if (Submission::mark_as_viewed($submission_id)) {
                            $success_count++;
                        }
                    }
                    $redirect_url = add_query_arg([
                        'bulk_marked' => '1',
                        'count' => $success_count,
                        'total' => $total_count
                    ], remove_query_arg(['action', 'submission']));
                    break;
            }

            if (isset($redirect_url)) {
                wp_redirect($redirect_url);
                exit;
            }
        }
    }

    /**
     * Display admin notices based on URL parameters
     */
    public function display_admin_notices()
    {
        // Single delete notices
        if (isset($_GET['deleted'])) {
            $deleted = $_GET['deleted'];
            if ($deleted === '1') {
                echo '<div class="notice notice-success is-dismissible"><p>' .
                    esc_html__('Submission deleted successfully.', 'quotemate') . '</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>' .
                    esc_html__('Failed to delete submission.', 'quotemate') . '</p></div>';
            }
        }

        // Bulk delete notices
        if (isset($_GET['bulk_deleted'])) {
            $count = (int) ($_GET['count'] ?? 0);
            $total = (int) ($_GET['total'] ?? 0);

            if ($count === $total && $count > 0) {
                $message = sprintf(
                    _n('%d submission deleted successfully.', '%d submissions deleted successfully.', $count, 'quotemate'),
                    $count
                );
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($message) . '</p></div>';
            } elseif ($count > 0) {
                $message = sprintf(
                    esc_html__('%d of %d submissions deleted successfully.', 'quotemate'),
                    $count,
                    $total
                );
                echo '<div class="notice notice-warning is-dismissible"><p>' . $message . '</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>' .
                    esc_html__('Failed to delete submissions.', 'quotemate') . '</p></div>';
            }
        }

        // Bulk mark viewed notices
        if (isset($_GET['bulk_marked'])) {
            $count = (int) ($_GET['count'] ?? 0);
            $total = (int) ($_GET['total'] ?? 0);

            if ($count === $total && $count > 0) {
                $message = sprintf(
                    _n('%d submission marked as viewed.', '%d submissions marked as viewed.', $count, 'quotemate'),
                    $count
                );
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($message) . '</p></div>';
            } elseif ($count > 0) {
                $message = sprintf(
                    esc_html__('%d of %d submissions marked as viewed.', 'quotemate'),
                    $count,
                    $total
                );
                echo '<div class="notice notice-warning is-dismissible"><p>' . $message . '</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>' .
                    esc_html__('Failed to mark submissions as viewed.', 'quotemate') . '</p></div>';
            }
        }
    }

    public function prepare_items()
    {
        // Process actions before preparing items
        $this->process_actions();

        $orderby = $_GET['orderby'] ?? 'created_at';
        $order   = $_GET['order'] ?? 'DESC';
        $search  = $_REQUEST['s'] ?? '';

        $per_page = $this->get_items_per_page('quotemate_submissions_per_page', 10);
        $current_page = $this->get_pagenum();
        $offset = ($current_page - 1) * $per_page;

        // Get submissions for this form
        $submissions = Submission::get_by_form($this->form_id, $per_page, $offset);
        
        // Count total submissions for pagination
        global $wpdb;
        $table = $wpdb->prefix . 'quotemate_submissions';
        $total_items = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table WHERE form_id = %d",
            $this->form_id
        ));

        // Format submissions for display
        $data = [];
        foreach ($submissions as $submission) {
            $submitted_data = json_decode($submission->submitted_data, true) ?: [];
            $email = $submission->user_email;
            
            // If email is empty, try to find it in submitted data
            if (empty($email)) {
                foreach ($submitted_data as $field_id => $field_data) {
                    if ($field_data['type'] === 'email' && !empty($field_data['value'])) {
                        $email = $field_data['value'];
                        break;
                    }
                }
            }
            
            $data[] = [
                'ID'         => $submission->id,
                'email'      => $email,
                'price'      => $submission->price,
                'status'     => $submission->viewed ? 'Viewed' : 'New',
                'created_at' => $submission->created_at,
                'data'       => $submitted_data,
            ];
        }

        $this->_column_headers = [$this->get_columns(), [], $this->get_sortable_columns()];
        $this->items = $data;

        $this->set_pagination_args([
            'total_items' => $total_items,
            'per_page'    => $per_page,
            'total_pages' => ceil($total_items / $per_page),
        ]);
    }

    public function column_cb($item)
    {
        return sprintf(
            '<input type="checkbox" name="submission[]" value="%s" />',
            SanitizationHelper::sanitize($item['ID'], 'attr')
        );
    }

    public function column_id($item)
    {
        $id = $item['ID'];
        $base_url = admin_url('admin.php?page=quotemate-submissions&form_id=' . $this->form_id);
        $delete_nonce = wp_create_nonce('delete_submission_' . $id);

        $actions = [
            'view' => sprintf('<a href="%s">View</a>', SanitizationHelper::sanitize(admin_url("admin.php?page=quotemate-view-submission&submission_id=$id"), 'url')),
            'delete' => sprintf(
                '<a href="%s" class="submitdelete">Delete</a>',
                SanitizationHelper::sanitize("$base_url&action=delete&submission_id=$id&_wpnonce=$delete_nonce", 'url')
            ),
        ];

        return sprintf(
            '<a href="%s"><strong>%s</strong></a> %s',
            SanitizationHelper::sanitize(admin_url("admin.php?page=quotemate-view-submission&submission_id=$id"), 'url'),
            SanitizationHelper::sanitize($item['ID'], 'html'),
            $this->row_actions($actions)
        );
    }

    public function column_email($item)
    {
        return SanitizationHelper::sanitize($item['email'], 'html');
    }

    public function column_price($item)
    {
        return '$' . number_format($item['price'], 2);
    }

    public function column_status($item)
    {
        $status = $item['status'];
        $class = $status === 'New' ? 'new-submission' : '';
        
        return sprintf(
            '<span class="%s">%s</span>',
            $class,
            SanitizationHelper::sanitize($status, 'html')
        );
    }

    public function column_created_at($item)
    {
        $date = DateHelper::format_date($item['created_at']);
        return SanitizationHelper::sanitize($date, 'html');
    }

    public function column_default($item, $column_name)
    {
        return isset($item[$column_name]) ? SanitizationHelper::sanitize($item[$column_name], 'html') : '';
    }
} 