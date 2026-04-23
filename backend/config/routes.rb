Rails.application.routes.draw do
  devise_for :users,
    path: "api/v1/auth",
    path_names: {
      sign_in: "login",
      sign_out: "logout",
      registration: "register"
    },
    controllers: {
      sessions: "api/v1/auth/sessions",
      registrations: "api/v1/auth/registrations"
    }

  namespace :api do
    namespace :v1 do
      resources :books do
        resources :borrowings, only: [:create]
      end
      resources :borrowings, only: [:index] do
        member do
          patch "return", action: :return_book
        end
      end
      get "users/me", to: "users#me"
      namespace :dashboard do
        get :librarian
        get :member
      end
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
