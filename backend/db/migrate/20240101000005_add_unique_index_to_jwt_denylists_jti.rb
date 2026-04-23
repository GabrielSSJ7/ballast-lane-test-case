class AddUniqueIndexToJwtDenylistsJti < ActiveRecord::Migration[8.0]
  def change
    remove_index :jwt_denylists, :jti
    add_index :jwt_denylists, :jti, unique: true
  end
end
