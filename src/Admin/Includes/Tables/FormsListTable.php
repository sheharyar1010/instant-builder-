<?php

namespace Dawnsol\Quotemate\Admin\Includes\Tables;

use Dawnsol\Quotemate\Admin\Models\Form;
use Dawnsol\Quotemate\Helpers\SanitizationHelper;

defined('ABSPATH') || exit;

if (!class_exists('WP_List_Table')) {
    require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

class FormsListTable extends \WP_List_Table
{
    public function __construct()
    {
        parent::__construct([
            'singular' => 'form',
            'plural'   => 'forms',
            'ajax'     => false,
        ]);
    }

    public function get_columns()
    {
        return [
            'cb'           => '<input type="checkbox" />',
            'title'        => 'Form Name',
            'status'       => 'Status',
            'template'     => 'Template',
            'shortcode'    => 'Shortcode',
            'created_at'   => 'Date Created',
            'submissions'  => 'Submissions',
        ];
    }

    public function get_sortable_columns()
    {
        return [
            'title'       => ['name', true],
            'status'      => ['status', false],
            'created_at'  => ['created_at', false],
        ];
    }

    public function get_bulk_actions()
    {
        return [
            'delete'     => 'Delete',
            'activate'   => 'Activate',
            'deactivate' => 'Deactivate',
        ];
    }

    public function get_views()
    {
        $total    = Form::countByStatus();
        $active   = Form::countByStatus('active');
        $inactive = Form::countByStatus('inactive');

        $current = $_GET['status'] ?? 'all';
        $base_url = remove_query_arg(['status', 'paged']);

        return [
            'all' => sprintf(
                '<a href="%s"%s>All <span class="count">(%d)</span></a>',
                SanitizationHelper::sanitize(add_query_arg('status', 'all', $base_url), 'url'),
                $current === 'all' ? ' class="current"' : '',
                $total
            ),
            'active' => sprintf(
                '<a href="%s"%s>Active <span class="count">(%d)</span></a>',
                SanitizationHelper::sanitize(add_query_arg('status', 'active', $base_url), 'url'),
                $current === 'active' ? ' class="current"' : '',
                $active
            ),
            'inactive' => sprintf(
                '<a href="%s"%s>Inactive <span class="count">(%d)</span></a>',
                SanitizationHelper::sanitize(add_query_arg('status', 'inactive', $base_url), 'url'),
                $current === 'inactive' ? ' class="current"' : '',
                $inactive
            ),
        ];
    }

    /**
     * Handle single and bulk actions
     * Made public so it can be called from the controller
     */
    public function process_actions()
    {
        $action = $this->current_action();

        if (!$action) {
            return;
        }

        // Check user capabilities before processing any actions
        if (!current_user_can('manage_options')) {
            wp_die(__('Sorry, you are not allowed to access this page.', 'quotemate'));
        }

        // Handle single delete action
        if ($action === 'delete' && isset($_GET['id'])) {
            $form_id = (int) $_GET['id'];

            // Verify nonce for single delete
            if (!isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], 'delete_form_' . $form_id)) {
                wp_die(__('Security check failed. Please try again.', 'quotemate'));
            }

            $result = $this->delete_form($form_id);

            // Redirect back to forms list with success/error message
            $redirect_url = admin_url('admin.php?page=quotemate');
            $redirect_url = add_query_arg([
                'deleted' => $result ? '1' : '0',
                'count' => 1
            ], $redirect_url);

            wp_redirect($redirect_url);
            exit;
        }

        // Handle bulk actions
        if (isset($_POST['form']) && is_array($_POST['form'])) {
            // Verify nonce for bulk actions
            if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'bulk-forms')) {
                wp_die(__('Security check failed. Please try again.', 'quotemate'));
            }

            $form_ids = array_map('intval', $_POST['form']);
            $success_count = 0;
            $total_count = count($form_ids);

            switch ($action) {
                case 'delete':
                    foreach ($form_ids as $form_id) {
                        if ($this->delete_form($form_id)) {
                            $success_count++;
                        }
                    }
                    $redirect_url = add_query_arg([
                        'bulk_deleted' => '1',
                        'count' => $success_count,
                        'total' => $total_count
                    ], admin_url('admin.php?page=quotemate'));
                    break;

                case 'activate':
                    foreach ($form_ids as $form_id) {
                        if ($this->toggle_form_status($form_id, true)) {
                            $success_count++;
                        }
                    }
                    $redirect_url = add_query_arg([
                        'bulk_activated' => '1',
                        'count' => $success_count,
                        'total' => $total_count
                    ], admin_url('admin.php?page=quotemate'));
                    break;

                case 'deactivate':
                    foreach ($form_ids as $form_id) {
                        if ($this->toggle_form_status($form_id, false)) {
                            $success_count++;
                        }
                    }
                    $redirect_url = add_query_arg([
                        'bulk_deactivated' => '1',
                        'count' => $success_count,
                        'total' => $total_count
                    ], admin_url('admin.php?page=quotemate'));
                    break;
            }

            if (isset($redirect_url)) {
                wp_redirect($redirect_url);
                exit;
            }
        }

        // Handle toggle status action
        if ($action === 'toggle_status' && isset($_GET['id'])) {
            $form_id = (int) $_GET['id'];

            // Verify nonce for toggle status
            if (!isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], 'toggle_status_' . $form_id)) {
                wp_die(__('Security check failed. Please try again.', 'quotemate'));
            }

            $result = $this->toggle_form_status($form_id);

            // Redirect back to forms list with success/error message
            $redirect_url = admin_url('admin.php?page=quotemate');
            $redirect_url = add_query_arg([
                'status_toggled' => $result ? '1' : '0'
            ], $redirect_url);

            wp_redirect($redirect_url);
            exit;
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
                    esc_html__('Form deleted successfully.', 'quotemate') . '</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>' .
                    esc_html__('Failed to delete form.', 'quotemate') . '</p></div>';
            }
        }

        // Bulk delete notices
        if (isset($_GET['bulk_deleted'])) {
            $count = (int) ($_GET['count'] ?? 0);
            $total = (int) ($_GET['total'] ?? 0);

            if ($count === $total && $count > 0) {
                $message = sprintf(
                    _n('%d form deleted successfully.', '%d forms deleted successfully.', $count, 'quotemate'),
                    $count
                );
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($message) . '</p></div>';
            } elseif ($count > 0) {
                $message = sprintf(
                    esc_html__('%d of %d forms deleted successfully.', 'quotemate'),
                    $count,
                    $total
                );
                echo '<div class="notice notice-warning is-dismissible"><p>' . $message . '</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>' .
                    esc_html__('Failed to delete forms.', 'quotemate') . '</p></div>';
            }
        }

        // Bulk activate notices
        if (isset($_GET['bulk_activated'])) {
            $count = (int) ($_GET['count'] ?? 0);
            $total = (int) ($_GET['total'] ?? 0);

            if ($count === $total && $count > 0) {
                $message = sprintf(
                    _n('%d form activated successfully.', '%d forms activated successfully.', $count, 'quotemate'),
                    $count
                );
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($message) . '</p></div>';
            } elseif ($count > 0) {
                $message = sprintf(
                    esc_html__('%d of %d forms activated successfully.', 'quotemate'),
                    $count,
                    $total
                );
                echo '<div class="notice notice-warning is-dismissible"><p>' . $message . '</p></div>';
            }
        }

        // Bulk deactivate notices
        if (isset($_GET['bulk_deactivated'])) {
            $count = (int) ($_GET['count'] ?? 0);
            $total = (int) ($_GET['total'] ?? 0);

            if ($count === $total && $count > 0) {
                $message = sprintf(
                    _n('%d form deactivated successfully.', '%d forms deactivated successfully.', $count, 'quotemate'),
                    $count
                );
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($message) . '</p></div>';
            } elseif ($count > 0) {
                $message = sprintf(
                    esc_html__('%d of %d forms deactivated successfully.', 'quotemate'),
                    $count,
                    $total
                );
                echo '<div class="notice notice-warning is-dismissible"><p>' . $message . '</p></div>';
            }
        }

        // Status toggle notices
        if (isset($_GET['status_toggled'])) {
            $toggled = $_GET['status_toggled'];
            if ($toggled === '1') {
                echo '<div class="notice notice-success is-dismissible"><p>' .
                    esc_html__('Form status updated successfully.', 'quotemate') . '</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>' .
                    esc_html__('Failed to update form status.', 'quotemate') . '</p></div>';
            }
        }
    }

    /**
     * Delete a form
     */
    private function delete_form($form_id)
    {
        if (!$form_id) {
            return false;
        }

        return Form::delete($form_id);
    }

    /**
     * Toggle form status
     */
    private function toggle_form_status($form_id, $status = null)
    {
        if (!$form_id) {
            return false;
        }

        // If status is not provided, get current status and toggle it
        if ($status === null) {
            $form = Form::find($form_id);
            if (!$form) {
                return false;
            }
            $status = !$form->active;
        }

        return Form::updateStatus($form_id, $status);
    }

    public function prepare_items()
    {
        // Note: Actions are now processed in the controller before calling this method

        $orderby = $_GET['orderby'] ?? 'created_at';
        $order   = $_GET['order'] ?? 'DESC';
        $status  = $_GET['status'] ?? 'all';
        $search  = $_REQUEST['s'] ?? '';

        $per_page = $this->get_items_per_page('quotemate_forms_per_page', 10);
        $current_page = $this->get_pagenum();
        $offset = ($current_page - 1) * $per_page;

        $args = compact('orderby', 'order', 'status', 'search', 'per_page', 'offset');

        $total_items = Form::countFiltered($args);
        $forms = Form::searchPaginated($args);

        $data = array_map(function ($form) {
            return [
                'ID'           => $form['id'],
                'title'        => SanitizationHelper::sanitize($form['name'], 'html'),
                'template'     => SanitizationHelper::sanitize($form['template_name'] ?? '—', 'html'),
                'status'       => $form['active'] ? 'Active' : 'Inactive',
                'shortcode'    => "[quotemate_form id='{$form['id']}']",
                'created_at'   => SanitizationHelper::sanitize($form['created_at'], 'html'),
                'submissions'  => (int) $form['submissions_count'],
            ];
        }, $forms);

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
            '<input type="checkbox" name="form[]" value="%s" />',
            SanitizationHelper::sanitize($item['ID'], 'attr')
        );
    }

    public function column_title($item)
    {
        $id = $item['ID'];
        $base_url = admin_url('admin.php?page=quotemate');
        $delete_nonce = wp_create_nonce('delete_form_' . $id);
        $toggle_nonce = wp_create_nonce('toggle_status_' . $id);

        $actions = [
            'edit' => sprintf('<a href="%s">Edit</a>', SanitizationHelper::sanitize(admin_url("admin.php?page=quotemate-edit-form&form_id=$id"), 'url')),
            'delete' => sprintf(
                '<a href="%s" class="submitdelete" data-form-id="%d" data-form-title="%s">Delete</a>',
                SanitizationHelper::sanitize("$base_url&action=delete&id=$id&_wpnonce=$delete_nonce", 'url'),
                $id,
                SanitizationHelper::sanitize($item['title'], 'html')
            ),
            'preview-form' => sprintf('<a href="%s" target="_blank">Preview</a>', SanitizationHelper::sanitize(site_url("?quotemate_preview=$id"), 'url')),
            'toggle' => sprintf('<a href="%s">%s</a>', SanitizationHelper::sanitize("$base_url&action=toggle_status&id=$id&_wpnonce=$toggle_nonce", 'url'), $item['status'] === 'Active' ? 'Deactivate' : 'Activate'),
        ];

        return sprintf(
            '<a href="%s"><strong>%s</strong></a> %s',
            SanitizationHelper::sanitize(admin_url("admin.php?page=quotemate-edit-form&form_id=$id"), 'url'),
            SanitizationHelper::sanitize($item['title'], 'html'),
            $this->row_actions($actions)
        );
    }

    public function column_status($item)
    {
        return SanitizationHelper::sanitize($item['status'], 'html');
    }

    public function column_template($item)
    {
        return SanitizationHelper::sanitize($item['template'], 'html');
    }

    public function column_shortcode($item)
    {
        return SanitizationHelper::sanitize($item['shortcode'], 'html');
    }

    public function column_created_at($item)
    {
        return SanitizationHelper::sanitize($item['created_at'], 'html');
    }

    public function column_submissions($item)
    {
        $form_id = (int) $item['ID'];
        $count   = (int) $item['submissions'];

        $url = admin_url('admin.php?page=quotemate-submissions&form_id=' . $form_id);

        return sprintf(
            '<a href="%s" class="button button-small">View (%d)</a>',
            SanitizationHelper::sanitize($url, 'url'),
            $count
        );
    }
}
