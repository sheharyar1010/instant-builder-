<?php
// Submission Model (Admin/Models/Submission.php)
namespace Dawnsol\Quotemate\Admin\Models;

class Submission
{
    private static $table_name;

    public static function init()
    {
        global $wpdb;
        self::$table_name = $wpdb->prefix . 'quotemate_submissions';
    }

    public static function create($data)
    {
        
        global $wpdb;
        self::init();

        $defaults = [
            'form_id' => 0,
            'submitted_data' => '',
            'price' => 0.00,
            'viewed' => 0,
            'user_email' => '',
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ];

        $data = wp_parse_args($data, $defaults);

        $result = $wpdb->insert(
            self::$table_name,
            $data,
            ['%d', '%s', '%f', '%d', '%s', '%s', '%s']
        );

        return $result ? $wpdb->insert_id : false;
    }

    public static function find($id)
    {
        global $wpdb;
        self::init();

        return $wpdb->get_row(
            $wpdb->prepare("SELECT * FROM " . self::$table_name . " WHERE id = %d", $id)
        );
    }

    public static function get_by_form($form_id, $limit = 50, $offset = 0)
    {
        global $wpdb;
        self::init();

        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM " . self::$table_name . " WHERE form_id = %d ORDER BY created_at DESC LIMIT %d OFFSET %d",
                $form_id,
                $limit,
                $offset
            )
        );
    }

    public static function mark_as_viewed($id)
    {
        global $wpdb;
        self::init();

        return $wpdb->update(
            self::$table_name,
            ['viewed' => 1, 'updated_at' => current_time('mysql')],
            ['id' => $id],
            ['%d', '%s'],
            ['%d']
        );
    }

    public static function update_price($id, $price)
    {
        global $wpdb;
        self::init();

        return $wpdb->update(
            self::$table_name,
            ['price' => $price, 'updated_at' => current_time('mysql')],
            ['id' => $id],
            ['%f', '%s'],
            ['%d']
        );
    }

    public static function update_submitted_data($id, $submitted_data)
    {
        global $wpdb;
        self::init();

        return $wpdb->update(
            self::$table_name,
            ['submitted_data' => $submitted_data, 'updated_at' => current_time('mysql')],
            ['id' => $id],
            ['%s', '%s'],
            ['%d']
        );
    }

    public static function update($id, $data)
    {
        global $wpdb;
        self::init();

        // Ensure updated_at is set
        if (!isset($data['updated_at'])) {
            $data['updated_at'] = current_time('mysql');
        }

        // Prepare format array based on data keys
        $formats = [];
        foreach ($data as $key => $value) {
            switch ($key) {
                case 'form_id':
                    $formats[] = '%d';
                    break;
                case 'submitted_data':
                case 'user_email':
                case 'created_at':
                case 'updated_at':
                    $formats[] = '%s';
                    break;
                case 'price':
                    $formats[] = '%f';
                    break;
                case 'viewed':
                    $formats[] = '%d';
                    break;
                default:
                    $formats[] = '%s';
            }
        }

        return $wpdb->update(
            self::$table_name,
            $data,
            ['id' => $id],
            $formats,
            ['%d']
        );
    }

    public static function delete($id)
    {
        global $wpdb;
        self::init();

        return $wpdb->delete(
            self::$table_name,
            ['id' => $id],
            ['%d']
        );
    }

    public static function count_by_form($form_id)
    {
        global $wpdb;
        self::init();

        return $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM " . self::$table_name . " WHERE form_id = %d",
                $form_id
            )
        );
    }
}