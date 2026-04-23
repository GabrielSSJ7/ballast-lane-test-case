require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = false
  config.cache_store = :null_store
  config.action_dispatch.show_exceptions = :none
  config.action_controller.raise_on_unpermitted_parameters = true
  config.active_support.deprecation = :stderr
  config.active_record.verbose_query_logs = false
end
