<?php

namespace Dawnsol\Quotemate\Admin\Models;

use Dawnsol\Quotemate\Helpers\DateHelper;
use Dawnsol\Quotemate\Helpers\SanitizationHelper;
use Dawnsol\Quotemate\Helpers\LogHelper;
use Dawnsol\Quotemate\Traits\Singleton;

defined('ABSPATH') || exit;

class Form
{
    use Singleton;

    protected static $table;
    protected static $wpdb;

    public static function init()
    {
        global $wpdb;
        static::$wpdb = $wpdb;
        static::$table = $wpdb->prefix . 'quotemate_forms';
    }

    public static function create(array $data)
    {
        static::init();

        $data = array_merge([
            'active'     => 0,
            'settings'   => '',
            'fields'     => '',
            'created_at' => DateHelper::now(),
        ], $data);

        $inserted = static::$wpdb->insert(static::$table, [
            'name'        => $data['name'],
            'template_id' => $data['template_id'],
            'active'      => $data['active'],
            'settings'    => SanitizationHelper::sanitize($data['settings'], 'storable'),
            'fields'      => SanitizationHelper::sanitize($data['fields'], 'storable'),
            'created_at'  => $data['created_at'],
        ]);

        if ($inserted === false) {
            LogHelper::error('Failed to create form: ' . static::$wpdb->last_error);
            return false;
        }

        return static::$wpdb->insert_id;
    }

    public static function countByStatus($status = null)
    {
        static::init();

        if (is_null($status)) {
            return (int) static::$wpdb->get_var("SELECT COUNT(*) FROM " . static::$table);
        }

        return (int) static::$wpdb->get_var(
            static::$wpdb->prepare("SELECT COUNT(*) FROM " . static::$table . " WHERE active = %d", $status === 'active' ? 1 : 0)
        );
    }

    public static function searchPaginated($args = [])
    {
        static::init();

        $per_page = $args['per_page'] ?? 10;
        $offset   = $args['offset'] ?? 0;
        $orderby  = in_array($args['orderby'], ['name', 'active', 'created_at']) ? $args['orderby'] : 'created_at';
        $order    = strtoupper($args['order']) === 'ASC' ? 'ASC' : 'DESC';
        $search   = $args['search'] ?? '';
        $status   = $args['status'] ?? null;

        $where = [];
        if (!empty($search)) {
            $where[] = static::$wpdb->prepare("f.name LIKE %s", '%' . static::$wpdb->esc_like($search) . '%');
        }

        if ($status === 'active' || $status === 'inactive') {
            $where[] = static::$wpdb->prepare("f.active = %d", $status === 'active' ? 1 : 0);
        }

        $where_clause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $forms_table = static::$table;
        $templates_table = static::$wpdb->prefix . 'quotemate_templates';
        $subs_table = static::$wpdb->prefix . 'quotemate_submissions';

        // TEMPORARY: Use simple query without joins since template_id is not being used yet
        // This avoids issues with corrupted template/submission tables
        $sql = "
        SELECT f.*, 
                NULL AS template_name,
                0 AS submissions_count
            FROM {$forms_table} f
            {$where_clause}
            ORDER BY {$orderby} {$order}
            LIMIT %d OFFSET %d
        ";

        $results = static::$wpdb->get_results(
            static::$wpdb->prepare($sql, $per_page, $offset),
            ARRAY_A
        );

        return $results;
    }

    public static function countFiltered($args = [])
    {
        static::init();

        $search = $args['search'] ?? '';
        $status = $args['status'] ?? null;
        $where = [];

        if (!empty($search)) {
            $where[] = static::$wpdb->prepare("name LIKE %s", '%' . static::$wpdb->esc_like($search) . '%');
        }

        if ($status === 'active' || $status === 'inactive') {
            $where[] = static::$wpdb->prepare("active = %d", $status === 'active' ? 1 : 0);
        }

        $where_clause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        return (int) static::$wpdb->get_var("SELECT COUNT(*) FROM " . static::$table . " $where_clause");
    }
    // Add these methods to your existing Form model class

    /**
     * Find a form by ID
     *
     * @param int $id
     * @return object|null
     */
    public static function find($id)
    {
        static::init();

        $sql = static::$wpdb->prepare(
            "SELECT * FROM " . static::$table . " WHERE id = %d",
            $id
        );

        return static::$wpdb->get_row($sql);
    }

    /**
     * Update a form by ID
     *
     * @param int $id
     * @param array $data
     * @return bool
     */
    public static function update($id, array $data)
    {
        static::init();

        // Add updated_at timestamp if not provided
        if (!isset($data['updated_at'])) {
            $data['updated_at'] = DateHelper::now();
        }

        // Sanitize storable data if present
        if (isset($data['settings'])) {
            $data['settings'] = SanitizationHelper::sanitize($data['settings'], 'storable');
        }

        if (isset($data['fields'])) {
            $data['fields'] = SanitizationHelper::sanitize($data['fields'], 'storable');
        }

        $result = static::$wpdb->update(
            static::$table,
            $data,
            ['id' => $id],
            null, // format for data (null = auto-detect)
            ['%d'] // format for where clause
        );

        if ($result === false) {
            LogHelper::error('Failed to update form ID ' . $id . ': ' . static::$wpdb->last_error);
            return false;
        }

        return true;
    }

    /**
     * Delete a form by ID
     *
     * @param int $id
     * @return bool
     */
    public static function delete($id)
    {
        static::init();

        $result = static::$wpdb->delete(
            static::$table,
            ['id' => $id],
            ['%d']
        );

        return $result !== false;
    }

    /**
     * Get all forms with optional limit and offset
     *
     * @param int|null $limit
     * @param int $offset
     * @return array
     */
    public static function all($limit = null, $offset = 0)
    {
        static::init();

        $sql = "SELECT * FROM " . static::$table . " ORDER BY created_at DESC";

        if ($limit) {
            $sql .= static::$wpdb->prepare(" LIMIT %d OFFSET %d", $limit, $offset);
        }

        return static::$wpdb->get_results($sql);
    }





    public static function updateStatus($id, $status)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'quotemate_forms'; // adjust table name

        return $wpdb->update($table_name, ['active' => $status ? 1 : 0], ['id' => $id], ['%d'], ['%d']);
    }
}
