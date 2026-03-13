package com.erd

import com.erd.config.Auth
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

class AuthTest {

    companion object {
        @JvmStatic
        @BeforeAll
        fun setup() {
            Auth.init("test-secret-key-for-unit-testing-32chars")
        }
    }

    @Test
    fun `bcrypt hash and verify`() {
        val hashed = Auth.hashPassword("mypassword")
        assertThat(hashed).isNotEqualTo("mypassword")
        assertThat(Auth.checkPassword("mypassword", hashed)).isTrue()
        assertThat(Auth.checkPassword("wrongpassword", hashed)).isFalse()
    }

    @Test
    fun `JWT generate and validate`() {
        val token = Auth.generateToken(42)
        assertThat(token).isNotBlank()
        val userId = Auth.validateToken(token)
        assertThat(userId).isEqualTo(42)
    }

    @Test
    fun `JWT with invalid token throws exception`() {
        assertThatThrownBy { Auth.validateToken("invalid.token.here") }
            .isInstanceOf(Exception::class.java)
    }

    @Test
    fun `JWT with tampered token throws exception`() {
        val token = Auth.generateToken(1)
        val tampered = token.dropLast(5) + "XXXXX"
        assertThatThrownBy { Auth.validateToken(tampered) }
            .isInstanceOf(Exception::class.java)
    }
}
