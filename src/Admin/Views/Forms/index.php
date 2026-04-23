<?php

use Dawnsol\Quotemate\Helpers\SanitizationHelper;
?>

<div class="wrap">
    <h1 class="wp-heading-inline">All Forms</h1>

    <a href="<?php echo SanitizationHelper::sanitize(admin_url('admin.php?page=quotemate-new-form'), 'url'); ?>" class="page-title-action">Add New</a>

    <hr class="wp-header-end">

    <?php $table->display_admin_notices(); ?>

    <form method="get">
        <input type="hidden" name="page" value="<?php echo SanitizationHelper::sanitize($_REQUEST['page'], 'attr'); ?>" />

        <?php $table->views(); ?>

        <?php $table->search_box('Search Forms', 'form-search'); ?>
    </form>

    <form method="post">
        <?php $table->display(); ?>
    </form>
</div>