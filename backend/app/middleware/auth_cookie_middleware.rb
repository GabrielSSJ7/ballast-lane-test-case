class AuthCookieMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    inject_token_from_cookie(env)

    status, headers, body = @app.call(env)

    # Rack 3 normalises response header keys to lowercase; check both casings.
    auth_value = headers["Authorization"] || headers["authorization"]
    if auth_value.present?
      set_auth_cookie(env, headers, auth_value.delete_prefix("Bearer "))
    elsif logout_request?(env)
      clear_auth_cookie(headers)
    end

    [status, headers, body]
  end

  private

  def inject_token_from_cookie(env)
    return if env["HTTP_AUTHORIZATION"].present?

    cookies = Rack::Utils.parse_cookies(env)
    token = cookies["auth_token"]
    env["HTTP_AUTHORIZATION"] = "Bearer #{token}" if token.present?
  end

  def set_auth_cookie(env, headers, token)
    is_secure = env["HTTPS"] == "on" || env["HTTP_X_FORWARDED_PROTO"] == "https"
    cookie = build_cookie("auth_token", token, {
      path: "/", httponly: true, same_site: "Lax",
      max_age: 24 * 60 * 60, secure: is_secure
    })
    append_set_cookie(headers, cookie)
  end

  def clear_auth_cookie(headers)
    cookie = build_cookie("auth_token", "", { path: "/", httponly: true, max_age: 0 })
    append_set_cookie(headers, cookie)
  end

  def build_cookie(name, value, opts)
    cookie_str = "#{name}=#{Rack::Utils.escape(value)}"
    cookie_str += "; Path=#{opts[:path]}" if opts[:path]
    cookie_str += "; Max-Age=#{opts[:max_age]}" if opts.key?(:max_age)
    cookie_str += "; HttpOnly" if opts[:httponly]
    cookie_str += "; Secure" if opts[:secure]
    cookie_str += "; SameSite=#{opts[:same_site]}" if opts[:same_site]
    cookie_str
  end

  def append_set_cookie(headers, cookie)
    # Rack 3 uses lowercase "set-cookie"; check both and write to the same key.
    existing = headers["set-cookie"] || headers["Set-Cookie"]
    key = headers.key?("set-cookie") ? "set-cookie" : "Set-Cookie"
    headers[key] = existing.present? ? "#{existing}\n#{cookie}" : cookie
  end

  def logout_request?(env)
    env["REQUEST_METHOD"] == "DELETE" && env["PATH_INFO"]&.include?("/auth/logout")
  end
end
