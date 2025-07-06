package com.vish.fno.ChartsSimulator;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@OpenAPIDefinition(
		info = @Info(
				title = "Charts Simulator"
		)
)
@SpringBootApplication
public class ChartsSimulatorApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChartsSimulatorApplication.class, args);
	}
}
