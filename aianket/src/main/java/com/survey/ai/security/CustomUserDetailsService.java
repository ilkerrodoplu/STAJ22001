package com.survey.ai.security;


import com.survey.ai.entity.User;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found with email : " + email)
                );

        return new CustomUserDetails(user);
    }

    // ID ile kullanıcı detaylarını yükleme
    public UserDetails loadUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found with id : " + id)
                );

        return new CustomUserDetails(user);
    }
}
