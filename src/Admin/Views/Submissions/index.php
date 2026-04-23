<?php

use Dawnsol\Quotemate\Helpers\SanitizationHelper;
?>

<div class="wrap">
    <h1 class="wp-heading-inline">
        Submissions for: <?php echo SanitizationHelper::sanitize($form->name, 'html'); ?>
    </h1>

    <a href="<?php echo SanitizationHelper::sanitize(admin_url('admin.php?page=quotemate'), 'url'); ?>" class="page-title-action">
        Back to Forms
    </a>

    <hr class="wp-header-end">

    <?php $table->display_admin_notices(); ?>

    <form method="get">
        <input type="hidden" name="page" value="<?php echo SanitizationHelper::sanitize($_REQUEST['page'], 'attr'); ?>" />
        <input type="hidden" name="form_id" value="<?php echo SanitizationHelper::sanitize($form->id, 'attr'); ?>" />

        <?php $table->search_box('Search Submissions', 'submission-search'); ?>
    </form>

    <form method="post">
        <?php $table->display(); ?>
    </form>

    <div class="submission-legend">
        <span class="legend-item">
            <span class="status-indicator new-submission"></span> New Submission
        </span>
        <span class="legend-item">
            <span class="status-indicator"></span> Viewed Submission
        </span>
    </div>
</div> 