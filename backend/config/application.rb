require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "action_cable/engine"
require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module LibraryApi
  class Application < Rails::Application
    config.load_defaults 8.0
    config.api_only = true

    require_relative "../app/middleware/auth_cookie_middleware"
    config.middleware.insert_before 0, AuthCookieMiddleware
    config.middleware.use Rack::Attack
  end
end
