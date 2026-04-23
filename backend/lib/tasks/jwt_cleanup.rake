namespace :jwt do
  desc "Delete expired JWT denylist entries"
  task cleanup: :environment do
    deleted = JwtDenylist.where("exp < ?", Time.current).delete_all
    puts "Deleted #{deleted} expired JWT denylist entries."
  end
end
