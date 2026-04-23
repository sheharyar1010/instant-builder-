jQuery(document).ready(function($) {
    // Update price
    $('#update-price').on('click', function() {
        const price = $('#submission-price').val();
        updateSubmission({ price: price });
    });

    // Update submission data
    $('#update-submission').on('click', function() {
        const submittedData = {};
        
        $('#submission-fields tr').each(function() {
            const fieldId = $(this).data('field-id');
            const fieldLabel = $(this).find('td:first').text().trim().replace(/\s*\n.*$/, ''); // Remove field type text
            const fieldType = $(this).find('.field-type').text().trim().toLowerCase();
            
            let fieldValue;
            const valueElement = $(this).find('.field-value');
            
            if (fieldType === 'checkbox') {
                fieldValue = valueElement.is(':checked') ? '1' : '0';
            } else {
                fieldValue = valueElement.val();
            }
            
            submittedData[fieldId] = {
                label: fieldLabel,
                value: fieldValue,
                type: fieldType
            };
        });
        
        updateSubmission({ 
            submitted_data: JSON.stringify(submittedData)
        });
    });

    function updateSubmission(data) {
        data.submission_id = quotemate_submission.id;
        data.action = 'update_submission';
        data._wpnonce = quotemate_submission.nonce;
        
        $('#submission-messages').html('<div class="notice notice-info"><p>Updating submission...</p></div>');
        
        $.post(ajaxurl, data, function(response) {
            if (response.success) {
                $('#submission-messages').html('<div class="notice notice-success is-dismissible"><p>' + response.data.message + '</p></div>');
            } else {
                $('#submission-messages').html('<div class="notice notice-error is-dismissible"><p>' + response.data.message + '</p></div>');
            }
            
            // Make notices dismissible
            $('.notice-success, .notice-error').each(function() {
                const $el = $(this);
                const $button = $('<button type="button" class="notice-dismiss"><span class="screen-reader-text">Dismiss this notice.</span></button>');
                
                $button.on('click', function() {
                    $el.fadeOut(100);
                });
                
                $el.append($button);
            });
        }).fail(function() {
            $('#submission-messages').html('<div class="notice notice-error is-dismissible"><p>An error occurred while updating the submission.</p></div>');
        });
    }
}); 